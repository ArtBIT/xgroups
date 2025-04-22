import { createElement, nextTick } from "./utils.js";
import { Component } from "./components/component.js";

import css from "../xgroups.module.css";

// Modal Manager: Centralized modal registration and rendering
/**
 * Manages modal registration and rendering.
 * @param {Object} store - Global store instance
 * @returns {Object} ModalManager API
 */
export const ModalManager = (store) => {
  const modals = new Map();

  /**
   * Modal Component
   */
  class ModalComponent extends Component {
    render() {
      const { title, subtitle, children, onClose } = this.props;
      return createElement({
        tag: "div",
        className: css["modal-overlay"],
        on: {
          keydown: (e) => e.key === "Escape" && onClose(),
        },
        children: [
          {
            tag: "div",
            className: css["modal-window"],
            children: [
              {
                tag: "div",
                className: css["groups-form"],
                role: "dialog",
                "aria-modal": "true",
                style: { position: "relative" },
                children: [
                  {
                    tag: "div",
                    className: css["modal-header"],
                    children: [
                      {
                        tag: "h2",
                        className: css["form-title"],
                        textContent: title,
                      },
                      subtitle && {
                        tag: "h3",
                        className: css["form-subtitle"],
                        textContent: subtitle,
                      },
                    ],
                  },
                  {
                    tag: "div",
                    className: css["modal-content"],
                    children,
                  },
                  {
                    tag: "button",
                    textContent: "✖️",
                    "aria-label": "Close modal",
                    style: {
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                    },
                    on: {
                      click: onClose,
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    mount(container) {
      super.mount(container);
      nextTick(() => {
        this.element.classList.add(css["active"]);
      });

      this.element.focus();
    }
    unmount() {
      if (!this.element) return;
      // Trigger closing animation before removing
      this.element.classList.remove(css["active"]);
      setTimeout(super.unmount.bind(this), 200);
    }
  }

  /**
   * Registers a modal template.
   * @param {string} name - Modal name
   * @param {Function} template - Function returning modal content
   */
  const register = (name, template) => {
    modals.set(name, template);
  };

  /**
   * Closes the active modal.
   */
  const close = () => {
    const { modalsStack } = store.getState();
    if (modalsStack.length) {
      const activeModal = modalsStack.pop();
      activeModal.unmount();
    }
    store.setState({ modalsStack });
  };

  /**
   * Opens a modal by name with props.
   * @param {string} name - Modal name
   * @param {Object} props - Modal props
   */
  const open = (name, props = {}) => {
    const template = modals.get(name);
    if (!template) throw new Error(`Modal ${name} not registered`);
    const content = template(props, store);
    const modal = new ModalComponent(
      {
        modalName: name,
        ...props,
        children: [content],
        onClose: () => close(),
      },
      store
    );
    const modalsStack = store.getState().modalsStack || [];
    modalsStack.push(modal);
    modal.mount(document.body);
    store.setState({ modalsStack });
  };

  // Subscribe to state changes to close modal
  store.subscribe((state) => {
    const { modalsStack } = state;
    if (modalsStack.length) {
      const activeModal = modalsStack[modalsStack.length - 1];
      // re-render the template and replace the modal content
      const template = modals.get(activeModal.props.modalName);
      const content = template(activeModal.props, store);
      activeModal.props.children = [content];
      activeModal.element.classList.remove(css["active"]);
      activeModal.update();
      nextTick(() => {
        activeModal.element.classList.add(css["active"]);
      });
    }
  });

  return { register, open, close };
};
