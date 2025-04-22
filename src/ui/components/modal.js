import { createElement, nextTick } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";
/**
 * Modal Component
 */
export class Modal extends Component {
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
                    subtitle &&
                      typeof subtitle === "string" && {
                        tag: "h3",
                        className: css["form-subtitle"],
                        textContent: subtitle,
                      },
                    subtitle &&
                      subtitle instanceof HTMLElement && {
                        tag: "div",
                        className: css["form-subtitle"],
                        children: [subtitle],
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

export default Modal;
