import { createElement, updateDOM } from "../utils.js";
/**
 * Base Component class for UI elements.
 */
export class Component {
  /**
   * @param {Object} props - Component properties
   * @param {Object} store - Global store instance
   */
  constructor(props, store) {
    this.props = props || {};
    this.store = store;
    this.state = {};
    this.element = null;
    this.unsubscribe = null;
  }

  /**
   * Sets component state and triggers update.
   * @param {Object} newState - Partial state to merge
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.update();
  }

  setProps(newProps) {
    this.props = { ...this.props, ...newProps };
    this.update();
  }

  /**
   * Renders the component's DOM.
   * @returns {HTMLElement} Rendered element
   */
  render() {
    return createElement({
      tag: "div",
      textContent: "Base Component",
    });
  }

  /**
   * Mounts the component to a container.
   * @param {HTMLElement} container - DOM container
   */
  mount(container) {
    this.element = this.render();
    container.appendChild(this.element);
    if (this.store) {
      this.unsubscribe = this.store.subscribe(() => this.update());
    }
  }

  /**
   * Updates the component's DOM.
   */
  update() {
    if (!this.element) return;
    const newElement = this.render();
    updateDOM(this.element, newElement);
  }

  /**
   * Unmounts the component from the DOM.
   */
  unmount() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
