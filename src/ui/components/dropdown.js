import { createElement } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";
/**
 * Component: Dropdown select menu.
 */
export class Dropdown extends Component {
  render() {
    const { options, ...props } = this.props;
    return createElement({
      tag: "select",
      className: css["form-input"],
      children: options.map(({ label, value }) => ({
        tag: "option",
        value,
        textContent: label,
      })),
      ...props,
    });
  }
}

export default Dropdown;
