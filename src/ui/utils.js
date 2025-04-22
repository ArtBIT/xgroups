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
    if (typeof child === "string")
      element.appendChild(document.createTextNode(child));
    else if (child instanceof HTMLElement) element.appendChild(child);
    else element.appendChild(createElement(child));
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
