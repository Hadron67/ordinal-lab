import { App } from "./appmanager.js";

window.addEventListener('load', () => {
    const app = new App(document.body);

    registerServiceWorker().then(() => console.log('service worker installed')).catch(e => console.log(`failed to install service worker: ${e}`));
});

async function registerServiceWorker() {
    const reg = await navigator.serviceWorker.register('service.js', {scope: '.'});
}
