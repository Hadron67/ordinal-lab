import { App } from "./appmanager.js";

const data = localStorage.getItem('appData');
const app = new App(data === null ? null : JSON.parse(data));
document.body.prepend(app.appContainer);
setInterval(() => {
    localStorage.setItem('appData', JSON.stringify(app.getSaveData()));
}, 10000);
