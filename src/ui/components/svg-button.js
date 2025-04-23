import { createElement } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";

export class SVGButton extends Component {
  render() {
    const { svg, label = "", ariaLabel, ...props } = this.props;

    return createElement({
      ...props,
      tag: "div",
      role: "button",
      className: css["xgroups-svg-btn"],
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
