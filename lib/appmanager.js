/** @import { Applet, AppletEntry } from './app.types' */

import { deserializeOrdinalExpander, OrdinalListExpander, Y0SequenceOrdinalListExpander } from './enumerator.js';

export class App {
    /**
     * @param {any | null} data
     */
    constructor(data) {
        /** @type {AppletEntry[]} */
        this.applets = [];
        /** @type {HTMLElement} */
        this.appContainer = document.createElement('main');

        /** @type {HTMLDivElement} */
        this.tempRenderer = document.createElement('div');

        this.appContainer.appendChild(this.tempRenderer);

        /** @type {Map<string, (data: any) => (Applet | null)>} */
        this.appletDeserializers = new Map();

        this.appletDeserializers.set('ordinal-enumerator', deserializeOrdinalExpander);

        if (data !== null) {
            this.loadData(data);
        } else {
            this.applets.push({title: 'untitled', applet: new OrdinalListExpander(new Y0SequenceOrdinalListExpander())});
        }
        // for now
        this.appContainer.appendChild(this.applets[0].applet.root);
    }
    /**
     * @param {any} data
     * @returns {AppletEntry | null}
     */
    deserializeApplet(data) {
        const title = data.title ?? 'untitled';
        const des = this.appletDeserializers.get(data.type);
        if (des !== void 0) {
            const applet = des(data);
            return applet ? {applet, title} : null;
        }
        return null;
    }
    /**
     * @param {any} data
     */
    loadData(data) {
        if (Array.isArray(data.applets)) {
            for (const appletData of data.applets) {
                if (typeof appletData.type === 'string') {
                    const applet = this.deserializeApplet(appletData);
                    if (applet) {
                        this.applets.push(applet);
                    }
                }
            }
        }
    }
    getSaveData() {
        /** @type {any[]} */
        const applets = [];
        for (const applet of this.applets) {
            /** @type {any} */
            const appData = {title: applet.title};
            applet.applet.serialize(appData);
            applets.push(appData);
        }
        return {applets};
    }
}
