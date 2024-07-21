import { OrdinalExpander } from "./ordinal-expander.js";
import { OrdinalMarkup } from "./ordinal-markup.js";

const markup = new OrdinalMarkup();
const expander = new OrdinalExpander();

document.getElementsByTagName('main')[0].append(markup.root, expander.root);
