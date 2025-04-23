import { createElement, nextTick } from "./utils.js";
import { Modal } from "./components/modal.js";

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
    const modal = new Modal(
      {
        ...props,
        modalName: name,
        template: template,
        onClose: () => close(),
      },
      store
    );
    const modalsStack = store.getState().modalsStack || [];
    modalsStack.forEach((modal) => {
      modal.setProps({ active: false });
    });
    modalsStack.push(modal);
    modal.mount(document.body);
    store.setState({ modalsStack });
  };

  // Subscribe to state changes to close modal
  store.subscribe((state) => {
    const { modalsStack } = state;
    if (modalsStack.length) {
      const activeModal = modalsStack[modalsStack.length - 1];
      if (activeModal.props.active) return;
      nextTick(() => {
        activeModal.setProps({ active: true });
      });
    }
  });

  return { register, open, close };
};
