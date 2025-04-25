import { SVG } from "../../svg.js";
import { createElement } from "../utils.js";
import { Component } from "./component.js";

import css from "../../xgroups.module.css";

export class SVGIcon extends Component {
  render() {
    const { icon, ...props } = this.props;
    return SVG.get(icon, props);
  }
}

export default SVGIcon;
