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
        this.root = document.createElement('main');

        /** @type {HTMLDivElement} */
        this.tempRenderer = document.createElement('div');

        this.root.appendChild(this.tempRenderer);

        /** @type {Map<string, (data: any) => (Applet | null)>} */
        this.appletDeserializers = new Map();

        this.appletDeserializers.set('ordinal-enumerator', deserializeOrdinalExpander);

        if (data !== null) {
            this.loadData(data);
        } else {
            this.applets.push({title: 'untitled', applet: new OrdinalListExpander(new Y0SequenceOrdinalListExpander())});
        }
        // for now
        this.root.appendChild(this.applets[0].applet.root);
    }
    /**
     * @param {any} data
     */
    loadData(data) {
        if (Array.isArray(data.applets)) {
            for (const appletData of data.applets) {
                if (typeof appletData.type === 'string') {
                    const title = appletData.title ?? 'untitled';
                    const des = this.appletDeserializers.get(appletData.type);
                    if (des !== void 0) {
                        const applet = des(appletData);
                        if (applet) {
                            this.applets.push({applet, title});
                        }
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
