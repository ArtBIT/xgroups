import { config } from "./config.js";
import { debounce } from "./utils.js";
import { SVG } from "./svg.js";
import { Store } from "./store.js";
import { DataAPI } from "./api/data.js";
import {
  createElement,
  Component,
  FormInput,
  Dropdown,
  SVGButton,
  ModalManager,
  LoadingSpinner,
  showNotification,
} from "./ui";

import css from "./xgroups.module.css";
// cssString is used to inject CSS styles into the document
import cssString from "./xgroups.module.css?inline";

/**
 * Manages the UI with component-based rendering and DOM updates.
 * @param {Object} dataAPI - DataAPI instance
 * @param {Object} store - Global store instance
 * @returns {Object} UIManager API
 */
const UIManager = (dataAPI, store) => {
  const modalManager = ModalManager(store);
  let observe = true;

  // CSS Styles
  const style = createElement({
    tag: "style",
    id: "xgroups-styles",
    textContent: cssString,
  });
  document.head.appendChild(style);

  // groupManager Modal shows a list of groups with edit/remove links
  modalManager.register("groupManager", (props, store) =>
    createElement({
      tag: "div",
      className: css["groups-form"],
      children: [
        {
          style: {
            display: "flex",
            alignItems: "flex-start",
          },
          // import/export/gist buttons
          children: [
            {
              tag: "button",
              textContent: "Import",
              className: css["group-text-btn"],
              on: {
                click: () => {
                  modalManager.open("importData", {
                    title: "Import Data",
                    subtitle: "Paste your JSON data",
                  });
                },
              },
            },
            {
              tag: "button",
              textContent: "Export",
              className: css["group-text-btn"],
              on: {
                click: () => {
                  const data = dataAPI.getLocalData();
                  const blob = new Blob([data], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = createElement({
                    tag: "a",
                    href: url,
                    download: "xgroups.json",
                    style: { display: "none" },
                  });
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                },
              },
            },
            {
              tag: "button",
              textContent: "Sync...",
              className: css["group-text-btn"],
              on: {
                click: () => {
                  modalManager.open("gistSettings", {
                    title: "Gist Settings",
                  });
                },
              },
            },
          ],
        },
        {
          tag: "div",
          style: {
            overflowY: "auto",
            maxHeight: "300px",
          },
          children: [
            ...store.getState().groups.map((group) => ({
              tag: "div",
              className: css["group-item"],
              children: [
                {
                  tag: "button",
                  textContent: `${group.name} (${
                    dataAPI.getGroupUsers(group.name).length
                  })`,
                  title: group.description,
                  on: {
                    click: () => {
                      // show edit group modal
                      modalManager.open("groupUsers", {
                        groupName: group.name,
                        title: `Users in Group: ${group.name}`,
                        subtitle: createElement({
                          tag: "button",
                          textContent: "Edit",
                          on: {
                            click: () =>
                              modalManager.open("editGroup", {
                                group,
                                title: "Edit Group",
                              }),
                          },
                          style: { cursor: "pointer" },
                          className: css["group-tag-edit"],
                        }),
                      });
                    },
                  },
                },
                {
                  tag: "div",
                  style: {
                    display: "inline-flex",
                    gap: "5px",
                  },
                  children: [
                    {
                      tag: "button",
                      textContent: "Edit",
                      className: css["group-text-btn"],
                      on: {
                        click: () => {
                          // show edit group modal
                          modalManager.open("editGroup", {
                            group,
                            title: "Edit Group",
                          });
                        },
                      },
                    },
                    {
                      tag: "button",
                      textContent: "Remove",
                      className: css["group-text-btn"],
                      on: {
                        click: () => {
                          // check if there are any users in the group
                          const users = dataAPI.getGroupUsers(group.name);
                          if (users.length > 0) {
                            if (
                              !confirm(
                                `Are you sure you want to remove the group "${group.name}"?`
                              )
                            ) {
                              return;
                            }
                          }
                          dataAPI.removeGroup(group.name);
                        },
                      },
                    },
                  ],
                },
              ],
            })),
          ],
        },
        {
          tag: "button",
          textContent: "Add Group",
          className: css["group-btn"],
          on: {
            click: () => {
              // show add group modal
              modalManager.open("addGroup", {
                title: "Add Group",
              });
            },
          },
        },
      ],
    })
  );
  // Register Gist Settings Modal
  modalManager.register("gistSettings", (props, store) => {
    return createElement({
      tag: "form",
      className: css["groups-form"],
      on: {
        submit: async (e) => {
          e.preventDefault();
          const token = e.target.elements.token.value;
          const gistId = e.target.elements.gistId.value;
          if (e.submitter.name === "cancel") {
            modalManager.close();
            return;
          }
          if (token) {
            GM_setValue("xgroups_gist_token", token);
            debugger;
            if (!gistId) {
              try {
                const id = await dataAPI.createGist();
                if (id) {
                  showNotification({
                    text: `Gist created: https://gist.github.com/${id}`,
                    url: `https://gist.github.com/${id}`,
                  });
                }
              } catch (e) {
                console.error("Failed to create Gist:", e);
                showNotification({
                  text: "Failed to create Gist. Check your token.",
                });
                return;
              }
            } else {
              GM_setValue("xgroups_gist_id", gistId);
            }
            await dataAPI.syncWithGist();
            modalManager.close();
          } else {
            showNotification({
              text: "Please enter a GitHub Personal Access Token.",
            });
          }
        },
      },
      children: [
        new FormInput(
          {
            type: "text",
            label: "GitHub Personal Access Token",
            name: "token",
            value: GM_getValue("xgroups_gist_token", ""),
          },
          store
        ).render(),
        new FormInput(
          {
            type: "text",
            label: "Gist ID (leave blank to create new)",
            name: "gistId",
            value: GM_getValue("xgroups_gist_id", ""),
          },
          store
        ).render(),
        {
          tag: "p",
          children: [
            {
              tag: "a",
              textContent: "Generate new Personal Access Token?",
              href: "https://github.com/settings/personal-access-tokens/new",
              target: "_blank",
              style: {
                color: "var(--xgroups-ui-primary)",
                textDecoration: "underline",
              },
            },
            {
              tag: "span",
              textContent: " (only allow 'gist' scope)",
            },
          ],
        },
        createElement({
          className: css["form-footer"],
          children: [
            {
              tag: "button",
              type: "submit",
              name: "cancel",
              className: css["group-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "save",
              className: css["group-btn"],
              textContent: "Save",
            },
            {
              tag: "button",
              type: "button",
              name: "sync",
              className: css["group-btn"],
              textContent: "Sync Now",
              on: {
                click: async () => {
                  store.setState({ loading: true });
                  const id = await dataAPI.syncWithGist();
                  store.setState({ loading: false });
                  if (id) {
                    showNotification({
                      text: `Gist updated: https://gist.github.com/${id}`,
                      url: `https://gist.github.com/${id}`,
                    });
                    modalManager.close();
                  }
                },
              },
            },
            {
              tag: "span",
              children: [new LoadingSpinner({}, store)],
            },
          ],
        }),
      ],
    });
  });

  modalManager.register("importData", (props, store) =>
    createElement({
      tag: "form",
      className: css["groups-form"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const jsonData = e.target.elements.jsonData.value;
          if (dataAPI.importData(jsonData)) {
            modalManager.close();
          } else {
            showNotification({ text: "Invalid JSON data." });
          }
        },
      },
      children: [
        {
          tag: "textarea",
          className: css["form-input"],
          placeholder: "Paste your JSON data here",
          rows: 20,
          on: {
            input: (e) => {
              const jsonData = e.target.value;
              if (dataAPI.importData(jsonData)) {
                modalManager.close();
              }
            },
          },
        },
        {
          tag: "button",
          textContent: "Import",
          className: css["group-btn"],
          type: "submit",
        },
      ],
    })
  );

  modalManager.register("editGroup", ({ group }, store) =>
    createElement({
      tag: "form",
      className: css["groups-form"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const name = e.target.elements.name.value;
          const description = e.target.elements.description.value;
          const bgColor = e.target.elements.bgColor.value;
          const fgColor = e.target.elements.fgColor.value;
          if (name) {
            const oldName = group.name;
            dataAPI.updateGroup(oldName, name, description, bgColor, fgColor);
            modalManager.close();
          } else {
            showNotification({ text: "Please enter a group name." });
          }
        },
      },
      children: [
        new FormInput(
          {
            type: "text",
            label: "Group Name",
            name: "name",
            value: group.name,
          },
          store
        ).render(),
        new FormInput(
          {
            type: "text",
            label: "Description",
            name: "description",
            value: group.description,
          },
          store
        ).render(),
        new FormInput(
          {
            type: "color",
            label: "Background Color",
            name: "bgColor",
            value: group.bgColor,
          },
          store
        ).render(),
        new FormInput(
          {
            type: "color",
            label: "Text Color",
            name: "fgColor",
            value: group.fgColor,
          },
          store
        ).render(),
        createElement({
          className: css["form-footer"],
          children: [
            {
              tag: "button",
              type: "submit",
              name: "cancel",
              className: css["group-btn"],
              textContent: "Cancel",
              on: {
                click: () => modalManager.close(),
              },
            },
            {
              tag: "button",
              type: "submit",
              name: "save",
              className: css["group-btn"],
              textContent: "Save Changes",
            },
          ],
        }),
      ],
    })
  );

  modalManager.register("addGroup", (props, store) =>
    createElement({
      tag: "form",
      className: css["groups-form"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const name = e.target.elements.name.value;
          const description = e.target.elements.description.value;
          const bgColor = e.target.elements.bgColor.value;
          const fgColor = e.target.elements.fgColor.value;
          if (name) {
            const group = dataAPI.addGroup(name, description, bgColor, fgColor);
            modalManager.close();
          } else {
            showNotification({ text: "Please enter a group name." });
          }
        },
      },
      children: [
        new FormInput(
          {
            type: "text",
            label: "Group Name",
            name: "name",
          },
          store
        ).render(),
        new FormInput(
          {
            type: "text",
            label: "Description",
            name: "description",
          },
          store
        ).render(),
        new FormInput(
          {
            type: "color",
            label: "Background Color",
            name: "bgColor",
            value: "#777777",
          },
          store
        ).render(),
        new FormInput(
          {
            type: "color",
            label: "Text Color",
            name: "fgColor",
            value: "#ffffff",
          },
          store
        ).render(),
        createElement({
          className: css["form-footer"],
          children: [
            {
              tag: "button",
              type: "submit",
              name: "cancel",
              className: css["group-btn"],
              textContent: "Cancel",
              on: {
                click: () => modalManager.close(),
              },
            },
            {
              tag: "button",
              type: "submit",
              name: "addGroup",
              className: css["group-btn"],
              textContent: "Add Group",
            },
          ],
        }),
      ],
    })
  );
  modalManager.register("groupUsers", (props, store) =>
    createElement({
      tag: "div",
      className: css["groups-form"],
      children: [
        {
          tag: "div",
          className: css["group-users-list"],
          style: { overflowY: "auto", maxHeight: "300px" },
          children: dataAPI.getGroupUsers(props.groupName).map((username) => ({
            tag: "div",
            className: css["group-item"],
            children: [
              {
                tag: "a",
                textContent: `@${username}`,
                href: dataAPI.getUserLink(username),
                target: "_blank",
              },
              // remove user from group button
              {
                tag: "button",
                textContent: "Remove",
                className: css["group-text-btn"],
                on: {
                  click: () => {
                    dataAPI.removeUserFromGroup(username, props.groupName);
                  },
                },
              },
            ],
          })),
        },
      ],
    })
  );

  modalManager.register("assignUser", ({ username }, store) =>
    createElement({
      tag: "form",
      className: css["groups-form"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const group = e.target.elements.group.value;
          if (e.submitter.name === "cancel") {
            modalManager.close();
            return;
          }
          if (group === "NEW") {
            const newGroup = prompt("Enter new group name:");
            if (newGroup) {
              dataAPI.addGroup(newGroup);
              dataAPI.addUserToGroup(username, newGroup);
              modalManager.close();
            }
          } else if (group) {
            dataAPI.addUserToGroup(username, group);
            modalManager.close();
          } else {
            showNotification({ text: "Please select a group." });
          }
        },
      },
      children: [
        new FormInput(
          {
            type: "text",
            label: "Assign User to Group",
            name: "username",
            value: username,
            readOnly: true,
            style: { cursor: "not-allowed" },
          },
          store
        ).render(),
        new Dropdown(
          {
            name: "group",
            options: [
              ...store.getState().groups.map((g) => ({
                label: `${g.name} ${g.description}`,
                value: g.name,
              })),
              { label: "Create New", value: "NEW" },
            ],
            on: {
              change: (e) => {
                const selectedValue = e.target.value;
                if (selectedValue === "NEW") {
                  modalManager.open("addGroup", {
                    title: "Add New Group",
                  });
                }
              },
            },
          },
          store
        ).render(),
        createElement({
          className: css["form-footer"],
          children: [
            {
              tag: "button",
              type: "submit",
              name: "cancel",
              className: css["group-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "assign",
              className: css["group-btn"],
              textContent: "Assign",
            },
          ],
        }),
      ],
    })
  );

  modalManager.register("removeUser", ({ username }, store) =>
    createElement({
      tag: "form",
      className: css["groups-form"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const group = e.target.elements.group.value;
          if (e.submitter.name === "cancel") {
            modalManager.close();
            return;
          }
          if (group) {
            dataAPI.removeUserFromGroup(username, group);
            modalManager.close();
          } else {
            showNotification({ text: "Please select a group." });
          }
        },
      },
      children: [
        new FormInput(
          {
            type: "text",
            label: "Remove User from Group",
            name: "username",
            value: username,
            readOnly: true,
            style: { cursor: "not-allowed" },
          },
          store
        ).render(),
        new Dropdown(
          {
            name: "group",
            options: dataAPI.getUserGroups(username).map((groupName) => {
              const group = store
                .getState()
                .groups.find((g) => g.name === groupName);
              return {
                label: `${group.name} ${group.description}`,
                value: group.name,
              };
            }),
          },
          store
        ).render(),
        createElement({
          className: css["form-footer"],
          children: [
            {
              tag: "button",
              type: "submit",
              name: "cancel",
              className: css["group-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "remove",
              className: css["group-btn"],
              textContent: "Remove",
            },
          ],
        }),
      ],
    })
  );

  /**
   * Component: Group tag display.
   */
  class GroupTags extends Component {
    render() {
      const { username } = this.props;
      const groups = dataAPI.getUserGroups(username);
      return createElement({
        className: css["group-tags"],
        children: [
          ...groups.map((groupName) => {
            const group = this.store
              .getState()
              .groups.find((g) => g.name === groupName);
            return createElement({
              tag: "span",
              className: css["group-tag"],
              textContent: group.name,
              title: group.description,
              style: {
                background: group.bgColor,
                color: group.fgColor,
              },
              on: {
                click: () =>
                  modalManager.open("groupUsers", {
                    groupName: group.name,
                    title: `Users in Group: ${group.name}`,
                    subtitle: createElement({
                      tag: "button",
                      textContent: "Edit",
                      on: {
                        click: () =>
                          modalManager.open("editGroup", {
                            group,
                            title: "Edit Group",
                          }),
                      },
                      style: { cursor: "pointer" },
                      className: css["group-tag-edit"],
                    }),
                  }),
              },
            });
          }),
          {
            className: css["group-tags-btns"],
            children: [
              {
                tag: "button",
                textContent: "➕",
                "aria-label": "+ Add user to group",
                on: {
                  click: () =>
                    modalManager.open("assignUser", {
                      username,
                      title: "Add to Group",
                    }),
                },
              },
              {
                tag: "button",
                textContent: "➖",
                "aria-label": "- Remove user from group",
                on: {
                  click: () =>
                    modalManager.open("removeUser", {
                      username,
                      title: "Remove User from Group",
                    }),
                },
              },
            ],
          },
        ],
      });
    }
  }

  /**
   * Updates group tags on tweets.
   */
  const updateTweetGroupTags = (tweet) => {
    const usernameLink =
      tweet.querySelector(config.usernameSelector) ||
      tweet.querySelector(config.usernameLinkSelector);
    if (!usernameLink) return;

    const username = dataAPI.normalizeUsername(usernameLink.textContent);
    const avatarContainer = tweet.querySelector(config.avatarSelector);
    if (!avatarContainer) return;

    const existingTags = avatarContainer.querySelector(`.${css["group-tags"]}`);
    if (existingTags) existingTags.remove();
    const groupTags = new GroupTags({ username }, store);
    groupTags.mount(avatarContainer);
  };

  const updateGroupTags = () => {
    observe = false;
    console.log("Updating group tags...");
    const tweets = document.querySelectorAll(config.tweetSelector);
    tweets.forEach(updateTweetGroupTags);
    setTimeout(() => {
      observe = true;
    }, 1);
  };

  /**
   * Initializes the group manager button.
   */
  const initGroupManager = () => {
    const button = new SVGButton(
      {
        svg: SVG.groups,
        style: {
          position: "fixed",
          top: "10px",
          right: "10px",
          width: "24px",
          height: "24px",
          fill: "var(--xgroups-ui-primary)",
          zIndex: 1001,
        },
        on: {
          click: () =>
            modalManager.open("groupManager", {
              title: "Manage Groups",
            }),
        },
      },
      store
    );
    button.mount(document.body);
  };

  // Initialize
  initGroupManager();
  dataAPI.syncWithGist();

  const debouncedUpdateGroupTags = debounce(updateGroupTags, 100);
  debouncedUpdateGroupTags();
  // Observe DOM changes
  const observer = new MutationObserver((mutationList) => {
    if (!observe) return;
    mutationList.forEach((mutation) => {
      Array.from(mutation.addedNodes).forEach(updateTweetGroupTags);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Subscribe to state changes for group updates
  store.subscribe((state) => {
    if (state.groups || state.userGroups) debouncedUpdateGroupTags();
  });

  return { updateGroupTags: debouncedUpdateGroupTags };
};

export class XGroups {
  constructor() {
    this.store = Store({
      groups: [],
      userGroups: {},
      modalsStack: [],
    });
    this.dataAPI = DataAPI(this.store);
    this.uiManager = UIManager(this.dataAPI, this.store);
  }
}

export default XGroups;
