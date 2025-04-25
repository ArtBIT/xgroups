import { classnames } from "../../utils.js";
import { createElement } from "../utils.js";
import { Component } from "./component.js";
import { SVGIcon } from "./svg-icon.js";

import css from "../../xgroups.module.css";

export class SVGButton extends Component {
  render() {
    const { icon, label = "", ariaLabel, ...props } = this.props;

    return createElement({
      ...props,
      tag: "div",
      role: "button",
      className: classnames(
        css["svg-btn"],
        css["xgroups-svg-btn"],
        props.className
      ),
      "aria-label": ariaLabel || label,
      children: [
        new SVGIcon({
          icon,
          title: ariaLabel || label,
          className: props.iconClassName,
        }),
        label && {
          tag: "span",
          textContent: label,
        },
      ],
    });
  }
}

export default SVGButton;
