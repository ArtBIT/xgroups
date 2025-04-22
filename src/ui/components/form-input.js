import { createElement } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";

/**
 * Component: Form input with label and placeholder.
 */
export class FormInput extends Component {
  render() {
    const { type, label, name, value = "", ...props } = this.props;
    return createElement({
      className: css["form-element"],
      children: [
        {
          tag: "input",
          type,
          name,
          value,
          className: css["form-input"],
          ...props,
        },
        label && {
          tag: "div",
          className: css["label-bg"],
          textContent: label,
        },
        label && {
          tag: "label",
          className: css["placeholder"],
          textContent: label,
          for: name,
        },
      ],
    });
  }
}

export default FormInput;
