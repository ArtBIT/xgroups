import { Component } from "./components/component.js";
/**
 * Creates a DOM element with attributes and children.
 * @param {Object} props - Component properties
 * @returns {HTMLElement} Created DOM element
 */
export const createElement = ({
  tag = "div",
  children = [],
  style = {},
  on = {},
  ...attributes
}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") element.className = value;
    else if (key === "textContent") element.textContent = value;
    else if (key === "innerHTML") element.innerHTML = value;
    else element.setAttribute(key, value);
  });
  Object.entries(style).forEach(([key, value]) => {
    element.style[key] = value;
  });
  Object.entries(on).forEach(([event, handler]) => {
    element.addEventListener(event, handler);
  });
  children.forEach((child) => {
    if (!child) return;
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      element.appendChild(child);
    } else if (child instanceof Component) {
      child.mount(element);
    } else element.appendChild(createElement(child));
  });
  return element;
};

export const nextTick = (fn) => {
  setTimeout(fn, 1);
};

export const showNotification = (options = {}) => {
  GM_notification({
    title: options.title || "XGroups",
    text: options.text || "This is the notification message.",
    ...options,
  });
  GM_log(`Notification: ${options.text}`);
};

export const updateDOM = (oldNode, newNode) => {
  if (!oldNode && !newNode) return;
  if (!oldNode) {
    return newNode;
  }
  if (!newNode) {
    oldNode.remove();
    return;
  }
  if (
    oldNode.tagName !== newNode.tagName ||
    (oldNode.childNodes.length === 0 && newNode.childNodes.length === 0)
  ) {
    oldNode.replaceWith(newNode);
    return;
  }
  // if has children
  if (oldNode.childNodes.length > 0 || newNode.childNodes.length > 0) {
    const oldChildren = Array.from(oldNode.childNodes);
    const newChildren = Array.from(newNode.childNodes);
    for (let i = 0; i < Math.max(oldChildren.length, newChildren.length); i++) {
      const node = updateDOM(oldChildren[i], newChildren[i]);
      if (node) {
        oldNode.appendChild(node);
      }
    }
  }
  // update attributes
  const oldAttributes = Array.from(oldNode.attributes);
  const newAttributes = Array.from(newNode.attributes);
  const oldAttributesMap = Object.fromEntries(
    oldAttributes.map((attr) => [attr.name, attr.value])
  );
  const newAttributesMap = Object.fromEntries(
    newAttributes.map((attr) => [attr.name, attr.value])
  );
  Object.keys(oldAttributesMap).forEach((key) => {
    if (!(key in newAttributesMap)) {
      oldNode.removeAttribute(key);
    }
  });
  Object.keys(newAttributesMap).forEach((key) => {
    if (oldAttributesMap[key] !== newAttributesMap[key]) {
      oldNode.setAttribute(key, newAttributesMap[key]);
    }
  });
};
