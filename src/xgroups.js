import { config } from "./config.js";
import { debounce, classnames } from "./utils.js";
import { Store } from "./store.js";
import { DataAPI } from "./api/data.js";
import {
  createElement,
  Component,
  FormInput,
  Dropdown,
  SVGButton,
  SVGIcon,
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
      className: css["xgroups"],
      children: [
        {
          className: css["settings-btns"],
          // import/export/gist buttons
          children: [
            new SVGButton({
              icon: "import",
              title: "Import groups from JSON",
              className: css["settings-btn"],
              on: {
                click: () => {
                  modalManager.open("importData", {
                    title: "Import Data",
                    subtitle: "Paste your JSON data",
                  });
                },
              },
            }),
            new SVGButton({
              icon: "export",
              title: "Export groups to JSON",
              className: css["settings-btn"],
              on: {
                click: () => {
                  const data = JSON.stringify(dataAPI.getLocalData());
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
            }),
            new SVGButton({
              icon: "sync",
              title: "Sync with Gist",
              className: css["settings-btn"],
              on: {
                click: () => {
                  modalManager.open("gistSettings", {
                    title: "Gist Settings",
                  });
                },
              },
            }),
          ],
        },
        {
          tag: "div",
          className: css["list"],
          style: {
            maxHeight: "300px",
          },
          children: [
            ...store.getState().groups.map((group) => ({
              tag: "div",
              className: css["list-item"],
              children: [
                {
                  tag: "button",
                  textContent: `${group.name} (${
                    dataAPI.getGroupUsers(group.id).length
                  })`,
                  title: group.description,
                  on: {
                    click: () => {
                      // show edit group modal
                      modalManager.open("groupUsers", {
                        groupId: group.id,
                        title: `Users in Group: ${group.name}`,
                        subtitle: createElement({
                          tag: "button",
                          textContent: "Edit group...",
                          className: css["text-btn"],
                          on: {
                            click: () =>
                              modalManager.open("editGroup", {
                                group,
                                title: "Edit Group",
                              }),
                          },
                        }),
                      });
                    },
                  },
                },
                {
                  tag: "div",
                  className: css["list-item-btns"],
                  children: [
                    new SVGButton({
                      icon: "pencil",
                      title: "Edit group",
                      className: css["icon-btn"],
                      on: {
                        click: () => {
                          // show edit group modal
                          modalManager.open("editGroup", {
                            group,
                            title: "Edit Group",
                          });
                        },
                      },
                    }),
                    new SVGButton({
                      icon: "trash",
                      title: "Remove group",
                      className: css["icon-btn"],
                      on: {
                        click: () => {
                          // check if there are any users in the group
                          const users = dataAPI.getGroupUsers(group.id);
                          if (users.length > 0) {
                            if (
                              !confirm(
                                `Are you sure you want to remove the group "${group.name}"?`
                              )
                            ) {
                              return;
                            }
                          }
                          dataAPI.removeGroup(group.id);
                        },
                      },
                    }),
                  ],
                },
              ],
            })),
          ],
        },
        {
          tag: "button",
          textContent: "Add Group",
          className: css["form-btn"],
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
      className: css["xgroups"],
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
              className: css["form-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "save",
              className: css["form-btn"],
              textContent: "Save",
            },
            {
              tag: "button",
              type: "button",
              name: "sync",
              className: css["form-btn"],
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
      className: css["xgroups"],
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
          className: css["form-btn"],
          type: "submit",
        },
      ],
    })
  );

  modalManager.register("editGroup", ({ group }, store) =>
    createElement({
      tag: "form",
      className: css["xgroups"],
      on: {
        submit: (e) => {
          e.preventDefault();
          // if submitted with cancel button, close modal
          if (e.submitter.name === "cancel") {
            modalManager.close();
            return;
          }
          const name = e.target.elements.name.value;
          const description = e.target.elements.description.value;
          const bgColor = e.target.elements.bgColor.value;
          const fgColor = e.target.elements.fgColor.value;
          if (name) {
            dataAPI.updateGroup(group.id, name, description, bgColor, fgColor);
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
              className: css["form-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "save",
              className: css["form-btn"],
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
      className: css["xgroups"],
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
              className: css["form-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "addGroup",
              className: css["form-btn"],
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
      className: css["xgroups"],
      children: [
        {
          tag: "div",
          className: css["list"],
          style: { maxHeight: "300px" },
          children: dataAPI.getGroupUsers(props.groupId).map((username) => ({
            tag: "div",
            className: css["list-item"],
            children: [
              {
                tag: "a",
                textContent: `@${username}`,
                href: dataAPI.getUserLink(username),
                target: "_blank",
              },
              // remove user from group button
              new SVGButton({
                icon: "trash",
                className: css["icon-btn"],
                title: "Remove user from group",
                on: {
                  click: () => {
                    dataAPI.removeUserFromGroup(username, props.groupId);
                  },
                },
              }),
            ],
          })),
        },
        {
          className: css["form-footer"],
          children: [
            {
              tag: "button",
              type: "submit",
              name: "close",
              className: css["form-btn"],
              textContent: "Close",
              on: {
                click: () => {
                  modalManager.close();
                },
              },
            },
          ],
        },
      ],
    })
  );

  modalManager.register("assignUser", ({ username }, store) =>
    createElement({
      tag: "form",
      className: css["xgroups"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const isNewGroup = e.target.elements.group.value === "NEW";
          const groupId = parseInt(e.target.elements.group.value);
          if (e.submitter.name === "cancel") {
            modalManager.close();
            return;
          }
          if (isNewGroup) {
            const newGroupName = prompt("Enter new group name:");
            if (newGroupName) {
              const newGroup = dataAPI.addGroup(newGroupName);
              dataAPI.addUserToGroup(username, newGroup.id);
              modalManager.close();
            }
          } else if (groupId) {
            dataAPI.addUserToGroup(username, groupId);
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
                value: g.id,
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
              className: css["form-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "assign",
              className: css["form-btn"],
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
      className: css["xgroups"],
      on: {
        submit: (e) => {
          e.preventDefault();
          const groupId = parseInt(e.target.elements.group.value);
          if (e.submitter.name === "cancel") {
            modalManager.close();
            return;
          }
          if (groupId) {
            dataAPI.removeUserFromGroup(username, groupId);
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
            options: dataAPI.getUserGroups(username).map((group) => ({
              label: `${group.name} ${group.description}`,
              value: group.id,
            })),
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
              className: css["form-btn"],
              textContent: "Cancel",
            },
            {
              tag: "button",
              type: "submit",
              name: "remove",
              title: "Remove user from group",
              className: css["form-btn"],
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
        className: classnames(css["xgroups"], css["group-tags"]),
        children: [
          ...groups.map((group) =>
            createElement({
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
                    groupId: group.id,
                    title: `Users in Group: ${group.name}`,
                    subtitle: createElement({
                      tag: "button",
                      textContent: "Edit group...",
                      className: css["text-btn"],
                      on: {
                        click: () =>
                          modalManager.open("editGroup", {
                            group,
                            title: "Edit Group",
                          }),
                      },
                    }),
                  }),
              },
            })
          ),
          {
            className: css["group-tags-btns"],
            children: [
              new SVGButton({
                icon: "userPlus",
                title: "Add user to group",
                iconClassName: css["group-tags-btn"],
                "aria-label": "Add user to group",
                on: {
                  click: () =>
                    modalManager.open("assignUser", {
                      username,
                      title: "Add to Group",
                    }),
                },
              }),
              new SVGButton({
                icon: "userMinus",
                title: "Remove user from group",
                iconClassName: css["group-tags-btn"],
                "aria-label": "- Remove user from group",
                on: {
                  click: () =>
                    modalManager.open("removeUser", {
                      username,
                      title: "Remove User from Group",
                    }),
                },
              }),
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
    if (!tweet || !tweet.querySelector) return;
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
    const button = createElement({
      className: css["xgroups"],
      children: [
        new SVGButton(
          {
            title: "Manage XGroups",
            icon: "groups",
            className: css["icon-btn"],
            style: {
              position: "fixed",
              top: "10px",
              right: "10px",
              width: "24px",
              height: "24px",
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
        ),
      ],
    });
    document.body.appendChild(button);
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
      loading: false,
    });
    this.dataAPI = DataAPI(this.store);
    this.uiManager = UIManager(this.dataAPI, this.store);
  }
}

export default XGroups;
