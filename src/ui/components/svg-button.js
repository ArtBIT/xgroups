import { createElement } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";

export class SVGButton extends Component {
  render() {
    const { on, svg, style, label = "", ariaLabel } = this.props;

    return createElement({
      tag: "div",
      role: "button",
      className: css["xgroups-button"],
      on,
      style,
      "aria-label": ariaLabel || label,
      children: [
        {
          tag: "div",
          innerHTML: svg,
        },
        label && {
          tag: "span",
          textContent: label,
        },
      ],
    });
  }
}

export default SVGButton;
