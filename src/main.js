// UPDATED: Uses `load` event instead of `DOMContentLoaded`
import { loadApp } from './dom.js';

window.addEventListener('load', loadApp);
