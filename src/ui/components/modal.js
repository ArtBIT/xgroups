import { classnames } from "../../utils.js";
import { createElement, nextTick } from "../utils.js";
import { Component } from "./component.js";
import { SVGButton } from "./svg-button.js";

import css from "../../xgroups.module.css";
/**
 * Modal Component
 */
export class Modal extends Component {
  render() {
    const { title, subtitle, template, onClose, active } = this.props;
    return createElement({
      tag: "div",
      className: classnames(
        css["xgroups"],
        css["modal-overlay"],
        active && css["active"]
      ),
      on: {
        keydown: (e) => e.key === "Escape" && onClose(),
      },
      children: [
        {
          tag: "div",
          className: classnames(css["modal-window"]),
          children: [
            {
              tag: "div",
              className: css["xgroups"],
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
                  children: [template?.(this.props, this.store)],
                },
                new SVGButton({
                  icon: "close",
                  className: css["modal-close"],
                  iconClassName: css["modal-close-icon"],
                  title: "Close modal",
                  on: {
                    click: onClose,
                  },
                }),
              ],
            },
          ],
        },
      ],
    });
  }

  mount(container) {
    super.mount(container);
    if (!this.props.active) {
      nextTick(() => {
        this.setProps({ active: true });
      });
    }

    this.element.focus();
  }
  unmount() {
    if (!this.element) return;
    // Trigger closing animation before removing
    this.setProps({ active: false });
    setTimeout(super.unmount.bind(this), 200);
  }
}

export default Modal;
