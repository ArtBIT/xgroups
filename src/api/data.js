import { GistAPI } from "./gist.js";
import { showNotification } from "../ui/utils.js";

// DataAPI: Handles localStorage and group management
/**
 * Manages group and user-group data with localStorage persistence.
 * @param {Object} store - Global store instance
 * @returns {Object} DataAPI with methods for group and user management
 */
export const DataAPI = (store) => {
  const GROUPS_KEY = "xgroups_groups";
  const USER_GROUPS_KEY = "xgroups_user_groups";
  const TIMESTAMP_KEY = "xgroups_data_timestamp";

  let localStorageCache = {
    groups: null,
    userGroups: null,
    timestamp: null,
  };

  /**
   * Saves groups to localStorage.
   */
  const saveGroups = () => {
    try {
      const groups = store.getState().groups;
      if (JSON.stringify(groups) !== JSON.stringify(localStorageCache.groups)) {
        GM_setValue(GROUPS_KEY, JSON.stringify(groups));
        updateTimestamp();
        localStorageCache.groups = groups;
      }
    } catch (e) {
      console.error("Failed to save groups:", e);
      showNotification({ text: "Unable to save group data." });
    }
  };

  /**
   * Normalizes a username by removing '@' and converting to lowercase.
   * @param {string} username - The username to normalize
   * @returns {string} Normalized username
   */
  const normalizeUsername = (username) =>
    (username || "").replace("@", "").toLowerCase();

  const getTimestamp = () => {
    return parseInt(GM_getValue(TIMESTAMP_KEY, "0"), 10);
  };
  const updateTimestamp = () => {
    const now = Date.now();
    GM_setValue(TIMESTAMP_KEY, now.toString());
  };

  /**
   * Loads groups from localStorage.
   * @returns {Array} Array of group objects
   */
  const loadGroups = () => {
    try {
      const loaded = JSON.parse(GM_getValue(GROUPS_KEY, "[]")) || [];
      return loaded.map((group) => ({
        name: group.name,
        bgColor: group.bgColor || "#777",
        fgColor: group.fgColor || "#fff",
        description: group.description || "",
      }));
    } catch (e) {
      console.error("Failed to load groups:", e);
      return [];
    }
  };

  const getLocalData = () => {
    const groups = store.getState().groups;
    const userGroups = Object.fromEntries(
      Object.entries(store.getState().userGroups).map(([username, groups]) => [
        username,
        Array.from(groups),
      ])
    );
    const timestamp = getTimestamp();
    return { groups, userGroups, timestamp };
  };

  const importData = (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.groups || !data.userGroups) {
        throw new Error("Invalid JSON format");
      }
      const groups = store.getState().groups;
      const userGroups = store.getState().userGroups;
      // Merge groups (avoid duplicates)
      const newGroups = data.groups.filter(
        (newGroup) => !groups.some((g) => g.name === newGroup.name)
      );
      store.setState({
        groups: [
          ...groups,
          ...newGroups.map((group) => ({
            name: group.name,
            bgColor: group.bgColor || "#777",
            fgColor: group.fgColor || "#fff",
            description: group.description || "",
          })),
        ],
      });
      // Merge userGroups
      Object.keys(data.userGroups).forEach((username) => {
        const normalized = normalizeUsername(username);
        if (!userGroups[normalized]) {
          userGroups[normalized] = new Set();
        }
        data.userGroups[username].forEach((group) => {
          if (store.getState().groups.some((g) => g.name === group)) {
            userGroups[normalized].add(group);
          }
        });
        if (userGroups[normalized].size === 0) {
          delete userGroups[normalized];
        }
      });
      store.setState({ userGroups: { ...userGroups } });
      updateTimestamp();
      saveUserGroups();
      saveGroups();
      return true;
    } catch (e) {
      console.error("Failed to import data:", e);
      showNotification({ text: "Invalid JSON file or format." });
      return false;
    }
  };

  /**
   * Loads user-group mappings from localStorage.
   * @returns {Object} User-group mappings
   */
  const loadUserGroups = () => {
    try {
      const users = JSON.parse(GM_getValue(USER_GROUPS_KEY, "{}")) || {};
      return Object.fromEntries(
        Object.entries(users).map(([username, groups]) => [
          username,
          new Set(groups),
        ])
      );
    } catch (e) {
      console.error("Failed to load user groups:", e);
      return {};
    }
  };

  /**
   * Saves user-group mappings to localStorage.
   */

  const saveUserGroups = () => {
    const users = Object.fromEntries(
      Object.entries(store.getState().userGroups).map(([username, groups]) => [
        username,
        Array.from(groups),
      ])
    );
    try {
      if (
        JSON.stringify(users) !== JSON.stringify(localStorageCache.userGroups)
      ) {
        GM_setValue(USER_GROUPS_KEY, JSON.stringify(users));
        updateTimestamp();
        localStorageCache.userGroups = users;
      }
    } catch (e) {
      console.error("Failed to save user groups:", e);
      showNotification({ text: "Unable to save user group data." });
    }
  };

  // Initialize store with data
  store.setState({
    groups: loadGroups(),
    userGroups: loadUserGroups(),
  });

  const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
      }
    }
  };

  const syncWithGist = async () => {
    if (!GistAPI.getToken() || !GistAPI.getGistId()) return;
    try {
      return await retry(async () => {
        const localData = getLocalData();
        const localTimestamp = parseInt(localData.timestamp || "0", 10);
        const gistData = await GistAPI.readGist(GistAPI.getGistId());
        const gistTimestamp = parseInt(gistData.timestamp || "0", 10);

        if (gistTimestamp > localTimestamp) {
          // Gist is newer, update local
          store.setState({
            groups: gistData.groups,
            userGroups: Object.fromEntries(
              Object.entries(gistData.userGroups).map(([username, groups]) => [
                username,
                new Set(groups),
              ])
            ),
          });
          saveGroups();
          saveUserGroups();
        } else if (localTimestamp > gistTimestamp) {
          // Local is newer, update Gist
          return await GistAPI.updateGist(GistAPI.getGistId(), localData);
        }
      });
    } catch (e) {
      console.error("Failed to sync with Gist:", e);
    }
  };

  // createGist should simply call GistAPI.createGist
  const createGist = async () => {
    if (!GistAPI.getToken()) {
      showNotification({ text: "Please set your Gist token in localStorage." });
      return;
    }
    try {
      const data = getLocalData();
      const gistId = await GistAPI.createGist(data);
      GM_setValue("xgroups_gist_id", gistId);
      return id;
    } catch (e) {
      console.error("Failed to create Gist:", e);
      showNotification({ text: "Failed to create Gist." });
    }
  };

  const getGroups = () => store.getState().groups;
  const getGroup = (name) =>
    store.getState().groups.find((g) => g.name === name);

  return {
    getGroups,
    getGroup,
    addGroup: (name, description = "", bgColor = "#777", fgColor = "#fff") => {
      const group = { name, description, bgColor, fgColor };
      store.setState({
        groups: [...store.getState().groups, group],
      });
      saveGroups();
      return group;
    },
    removeGroup: (name) => {
      // remove group from all users
      const userGroups = store.getState().userGroups;
      Object.keys(userGroups).forEach((username) => {
        userGroups[username].delete(name);
        if (userGroups[username].size === 0) delete userGroups[username];
      });
      store.setState({ userGroups: { ...userGroups } });
      saveGroups();
      saveUserGroups();
      store.setState({
        groups: store.getState().groups.filter((g) => g.name !== name),
        userGroups: { ...userGroups },
      });
    },
    updateGroup: (name, newName, description, bgColor, fgColor) => {
      if (name !== newName && getGroup(newName)) {
        showNotification({ text: "Group with this name already exists." });
        return;
      }

      const groups = getGroups();
      const groupIndex = groups.findIndex((g) => g.name === name);
      if (groupIndex === -1) return;

      const group = {
        ...groups[groupIndex],
        name: newName,
        description,
        bgColor,
        fgColor,
      };
      groups[groupIndex] = group;
      store.setState({ groups });
      saveGroups();
      if (name !== newName) {
        // update user groups
        const userGroups = store.getState().userGroups;
        Object.keys(userGroups).forEach((username) => {
          if (userGroups[username].has(name)) {
            userGroups[username].delete(name);
            userGroups[username].add(newName);
          }
        });
        store.setState({ userGroups: { ...userGroups } });
        saveUserGroups();
      }
    },
    getUserGroups: (username) =>
      Array.from(
        store.getState().userGroups[normalizeUsername(username)] || []
      ),
    getUserLink: (username) => `https://x.com/${normalizeUsername(username)}`,
    getGroupUsers: (groupName) =>
      Object.keys(store.getState().userGroups).filter((username) =>
        store.getState().userGroups[username].has(groupName)
      ),
    addUserToGroup: (username, group) => {
      username = normalizeUsername(username);
      const userGroups = store.getState().userGroups;
      userGroups[username] = userGroups[username] || new Set();
      userGroups[username].add(group);
      store.setState({ userGroups: { ...userGroups } });
      saveUserGroups();
    },
    removeUserFromGroup: (username, group) => {
      username = normalizeUsername(username);
      const userGroups = store.getState().userGroups;
      if (userGroups[username]) {
        userGroups[username].delete(group);
        if (userGroups[username].size === 0) delete userGroups[username];
        store.setState({ userGroups: { ...userGroups } });
        saveUserGroups();
      }
    },
    normalizeUsername,
    getLocalData,
    importData,
    syncWithGist,
    createGist,
  };
};

export default DataAPI;
