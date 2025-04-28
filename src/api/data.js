import { GistAPI } from "./gist.js";
import { showNotification } from "../ui/utils.js";
import { jsonFormatVersion } from "../config.js";

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
  const NEXT_ID_KEY = "xgroups_next_id";

  let localStorageCache = {
    groups: null,
    userGroups: null,
    timestamp: null,
  };

  // Get and increment next ID for groups
  const getNextId = () => {
    const nextId = parseInt(GM_getValue(NEXT_ID_KEY, "1"), 10);
    GM_setValue(NEXT_ID_KEY, (nextId + 1).toString());
    return nextId;
  };

  /**
   * Saves groups to localStorage.
   */
  const saveGroups = () => {
    try {
      const groups = store.getState().groups;
      if (JSON.stringify(groups) !== JSON.stringify(localStorageCache.groups)) {
        GM_setValue(GROUPS_KEY, groups);
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
      const loaded = GM_getValue(GROUPS_KEY, []);
      return loaded.map((group) => ({
        id: group.id || getNextId(), // Assign sequential ID if not present (for backward compatibility)
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
    const state = store.getState();
    const groups = state.groups;
    const userGroups = Object.fromEntries(
      Object.entries(state.userGroups).map(([username, groupIds]) => [
        username,
        Array.from(groupIds),
      ])
    );
    const timestamp = getTimestamp();
    const formatVersion = jsonFormatVersion;
    return { groups, userGroups, timestamp, formatVersion };
  };

  const importData = (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.groups || !data.userGroups) {
        throw new Error("Invalid JSON format");
      }
      const groups = data.groups.map((group) => ({
        id: parseInt(group.id),
        name: group.name,
        bgColor: group.bgColor || "#000",
        fgColor: group.fgColor || "#fff",
        description: group.description || "",
      }));
      const userGroups = {};
      Object.keys(data.userGroups).forEach((username) => {
        const normalized = normalizeUsername(username);
        const groupIds = new Set();
        data.userGroups[username].forEach((groupIdentifier) => {
          // Handle both old (name) and new (id) formats
          const id = parseInt(groupIdentifier);
          const group = groups.find((g) => g.id === id);
          if (group) {
            groupIds.add(group.id);
          }
        });
        if (groupIds.size > 0) {
          userGroups[normalized] = groupIds;
        }
      });
      store.setState({
        groups,
        userGroups,
      });
      // Update next ID based on loaded groups
      const maxId = Math.max(...groups.map((g) => parseInt(g.id) || 0), 0);
      GM_setValue(NEXT_ID_KEY, (maxId + 1).toString());
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
      const users = GM_getValue(USER_GROUPS_KEY, {});
      const groups = store.getState().groups;
      return Object.fromEntries(
        Object.entries(users).map(([username, groupIdentifiers]) => {
          // Convert group names to IDs for backward compatibility
          const groupIds = groupIdentifiers
            .map((identifier) => {
              const group = groups.find((g) => g.id === parseInt(identifier));
              return group ? group.id : null;
            })
            .filter((id) => id !== null);
          return [username, new Set(groupIds)];
        })
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
    const users = store.getState().userGroups;
    try {
      if (
        JSON.stringify(users) !== JSON.stringify(localStorageCache.userGroups)
      ) {
        // convert Set to array for storage
        const userGroups = Object.fromEntries(
          Object.entries(users).map(([username, groupIds]) => [
            username,
            Array.from(groupIds),
          ])
        );
        GM_setValue(USER_GROUPS_KEY, userGroups);
        updateTimestamp();
        localStorageCache.userGroups = { ...users };
      }
    } catch (e) {
      console.error("Failed to save user groups:", e);
      showNotification({ text: "Unable to save user group data." });
    }
  };

  // Initialize store with data
  store.setState({
    groups: loadGroups(),
  });
  store.setState({
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
        const gistId = GistAPI.getGistId();
        const gistData = await GistAPI.readGist(gistId);
        const gistTimestamp = parseInt(gistData.timestamp || "0", 10);

        if (gistTimestamp > localTimestamp) {
          // Gist is newer, overwrite local data
          const groups = gistData.groups.map((group) => ({
            id: group.id || getNextId(),
            name: group.name,
            bgColor: group.bgColor || "#000",
            fgColor: group.fgColor || "#fff",
            description: group.description || "",
          }));
          const userGroups = {};
          Object.keys(gistData.userGroups).forEach((username) => {
            const normalized = normalizeUsername(username);
            const groupIds = new Set();
            gistData.userGroups[username].forEach((groupIdentifier) => {
              const group = groups.find(
                (g) => g.id === groupIdentifier || g.name === groupIdentifier
              );
              if (group) {
                groupIds.add(group.id);
              }
            });
            if (groupIds.size > 0) {
              userGroups[normalized] = groupIds;
            }
          });
          store.setState({
            groups,
            userGroups,
          });
          // Update next ID based on loaded groups
          const maxId = Math.max(...groups.map((g) => parseInt(g.id) || 0), 0);
          GM_setValue(NEXT_ID_KEY, (maxId + 1).toString());
          saveGroups();
          saveUserGroups();
        } else if (localTimestamp > gistTimestamp) {
          // Local is newer, overwrite Gist
          return await GistAPI.updateGist(gistId, localData);
        }
      });
    } catch (e) {
      console.error("Failed to sync with Gist:", e);
      showNotification({ text: "Failed to sync with Gist." });
    }
  };

  const createGist = async () => {
    if (!GistAPI.getToken()) {
      showNotification({ text: "Please set your Gist token in localStorage." });
      return;
    }
    try {
      const data = getLocalData();
      const gistId = await GistAPI.createGist(data);
      GM_setValue("xgroups_gist_id", gistId);
      return gistId;
    } catch (e) {
      console.error("Failed to create Gist:", e);
      showNotification({ text: "Failed to create Gist." });
    }
  };

  const getGroups = () => store.getState().groups;
  const getGroup = (id) => store.getState().groups.find((g) => g.id === id);

  return {
    getGroups,
    getGroup,
    addGroup: (name, description = "", bgColor = "#777", fgColor = "#fff") => {
      const group = { id: getNextId(), name, description, bgColor, fgColor };
      store.setState({
        groups: [...store.getState().groups, group],
      });
      saveGroups();
      return group;
    },
    removeGroup: (id) => {
      // remove group from all users
      const userGroups = store.getState().userGroups;
      Object.keys(userGroups).forEach((username) => {
        userGroups[username].delete(id);
        if (userGroups[username].size === 0) delete userGroups[username];
      });
      store.setState({
        groups: store.getState().groups.filter((g) => g.id !== id),
        userGroups: { ...userGroups },
      });
      saveGroups();
      saveUserGroups();
    },
    updateGroup: (id, newName, description, bgColor, fgColor) => {
      const groups = getGroups();
      const groupIndex = groups.findIndex((g) => g.id === id);
      if (groupIndex === -1) return;

      if (groups.some((g) => g.name === newName && g.id !== id)) {
        showNotification({ text: "Group with this name already exists." });
        return;
      }

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
    },
    getUserGroups: (username) => {
      const groupIds = Array.from(
        store.getState().userGroups[normalizeUsername(username)] || []
      );
      return groupIds
        .map((id) => store.getState().groups.find((g) => g.id === id))
        .filter(Boolean);
    },
    getUserLink: (username) => `https://x.com/${normalizeUsername(username)}`,
    getGroupUsers: (groupId) =>
      Object.keys(store.getState().userGroups).filter((username) =>
        store.getState().userGroups[username].has(groupId)
      ),
    addUserToGroup: (username, groupId) => {
      username = normalizeUsername(username);
      const userGroups = store.getState().userGroups;
      userGroups[username] = userGroups[username] || new Set();
      userGroups[username].add(groupId);
      store.setState({ userGroups: { ...userGroups } });
      saveUserGroups();
    },
    removeUserFromGroup: (username, groupId) => {
      username = normalizeUsername(username);
      const userGroups = store.getState().userGroups;
      if (userGroups[username]) {
        userGroups[username].delete(groupId);
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
