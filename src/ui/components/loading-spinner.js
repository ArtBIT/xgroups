import { classnames } from "../../utils.js";
import { createElement } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";

export class LoadingSpinner extends Component {
  render() {
    const { loading } = this.store.getState();

    return createElement({
      ...this.props,
      tag: "div",
      className: classnames(css["loading-spinner"], !loading && css["hidden"]),
      children: [
        {
          tag: "div",
          className: css["loading-spinner-inner"],
        },
        {
          tag: "div",
          className: css["loading-spinner-cutout"],
        },
      ],
    });
  }
}

export default LoadingSpinner;
