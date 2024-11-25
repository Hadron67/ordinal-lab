/** @import { Applet, AppletInfo, Tabpage } from './types/app' */

import { deserializeOrdinalExpander, OrdinalListExpander, Y0SequenceOrdinalListExpander } from './enumerator.js';
import { TabHost } from './tabhost.js';

const APPLETS_STORE = 'applets';
const APPDATA_STORE = 'appdata';
const APPDATA_KEY = 'data';

/**
 * @param {(a: IDBDatabase) => void} cb
 */
function openDBRequest(cb) {
    const req = indexedDB.open('ordinal-lab', 1);
    req.addEventListener('success', function(ev) {
        cb(req.result);
    });
    req.addEventListener('upgradeneeded', function(ev) {
        const db = this.result;
        if (!db.objectStoreNames.contains(APPLETS_STORE)) {
            db.createObjectStore(APPLETS_STORE, {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains(APPDATA_STORE)) {
            db.createObjectStore(APPDATA_STORE);
        }
    });
}

/**
 * @implements {Tabpage}
 * @implements {AppletInfo}
 */
class AppletEntry {
    /**
     * @param {App} app
     * @param {Applet} applet
     * @param {string} title
     * @param {number} id
     */
    constructor(app, applet, title, id) {
        /** @type {App} */
        this.app = app;
        /** @type {Applet} */
        this.applet = applet;
        /** @type {string} */
        this.title = title;
        /** @type {number} */
        this.id = id;

        /** @type {HTMLLIElement} */
        this.headerElem = document.createElement('li');
        this.headerElem.textContent = title;
    }
    getTitle() {
        return document.createTextNode(this.title);
    }
    getRoot() {
        return this.applet.getRoot();
    }
    close() {
        throw new Error('Method not implemented.');
    }
    save() {
        this.app.requestDB(db => {
            const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
            const data = {id: this.id, title: this.title};
            this.applet.serialize(data);
            const req = store.put(data);
            // TODO: report error?
        });
    }
}

/**
 * @param {string} tag
 * @param {(Node | string)[]} children
 */
function html(tag, ...children) {
    const ret = document.createElement(tag);
    ret.append(...children);
    return ret;
}

/**
 * @param {string} text
 * @param {string} link
 */
function href(text, link) {
    const ret = document.createElement('a');
    ret.href = link;
    ret.target = '_blank';
    ret.text = text;
    return ret;
}

/** @implements {Tabpage} */
class WelcomeScreen {
    /**
     * @param {App} app
     */
    constructor(app) {
        /** @type {App} */
        this.app = app;
        /** @type {HTMLDivElement} */
        this.root = document.createElement('div');
        this.root.classList.add('welcome');

        /** @type {HTMLInputElement} */
        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.placeholder = 'Title for new applets';

        this.root.append(html('h2', 'Introduction'), html('p', 'This site is a collection of useful tools (called applets) for exploring and studying ', href('ordinal numbers', 'https://en.wikipedia.org/wiki/Ordinal_number'), '. Its also a work in progress.'));

        this.root.append(html('h2', 'Applets'));
        this.root.append(html('p', 'Title for new applets: ', this.titleInput));

        const appletList = document.createElement('ul');
        appletList.append(html('li', this.appletButton('0-Y sequence enumerator', () => new OrdinalListExpander(new Y0SequenceOrdinalListExpander()))));
        this.root.append(appletList);

        this.root.append(html('h2', 'Existing documents'));
        this.savedAppletList = document.createElement('table');
    }
    getTitle() {
        return document.createTextNode('Welcome');
    }
    getRoot() {
        return this.root;
    }
    close() {
        throw new Error('Method not implemented.');
    }
    /**
     * @param {string} text
     * @param {() => Applet} creator
     */
    appletButton(text, creator) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = text;
        btn.addEventListener('click', () => {
            const title = this.titleInput.value;
            this.app.newApplet(creator(), title.length === 0 ? 'untitled' : title);
        });
        return btn;
    }
}

export class App {
    /**
     * @param {HTMLElement} root
     */
    constructor(root) {
        /** @type {HTMLElement} */
        this.root = root;
        /** @type {HTMLElement} */
        this.appContainer = document.createElement('main');

        /** @type {AppletEntry | null} */
        this.currentApplet = null;

        /** @type {HTMLElement} */
        this.header = document.createElement('header');

        /** @type {HTMLUListElement} */
        this.appletList = document.createElement('ul');
        this.header.appendChild(this.appletList);

        this.mainTabHost = new TabHost(this.appletList, this.appContainer);
        this.mainTabHost.addTab(this.mainTabHost.createTab(new WelcomeScreen(this)));

        root.append(this.header, this.appContainer);

        /** @type {Map<string, (data: any) => (Applet | null)>} */
        this.appletDeserializers = new Map();

        this.appletDeserializers.set('ordinal-enumerator', deserializeOrdinalExpander);

        /** @type {IDBDatabase | null} */
        this.db = null;
        /** @type {((db: IDBDatabase) => void)[]} */
        this.dbRequests = [];
        openDBRequest(db => {
            this.db = db;
            for (const r of this.dbRequests) {
                r(db);
            }
            const store = db.transaction(APPLETS_STORE, 'readonly').objectStore(APPLETS_STORE);
            const req = store.getAll();
            req.addEventListener('success', () => {
                for (const data of req.result) {
                    const applet = this.deserializeApplet(data, data.title, data.id);
                    if (applet) {
                        this.mainTabHost.addTab(this.mainTabHost.createTab(applet)).select();
                    }
                }
            });
        });

        /** @type {boolean} */
        this.enableAutoSave = true;

        /** @type {number | null} */
        this.autoSaver = setInterval(() => {
            this.saveConfigData();
            if (this.enableAutoSave) {
                for (const app of this.mainTabHost.tabs) {
                    if (app.page instanceof AppletEntry) {
                        app.page.save();
                    }
                }
            }
        }, 10000);
    }
    /**
     * @param {(db: IDBDatabase) => void} cb
     */
    requestDB(cb) {
        if (this.db) {
            cb(this.db);
        } else {
            this.dbRequests.push(cb);
        }
    }
    /**
     * @param {any} data
     * @param {string} title
     * @param {number} id
     * @returns {AppletEntry | null}
     */
    deserializeApplet(data, title, id) {
        const des = this.appletDeserializers.get(data.type);
        if (des !== void 0) {
            const applet = des(data);
            return applet ? new AppletEntry(this, applet, title, id) : null;
        }
        return null;
    }
    /**
     * @param {(n: number) => void} cb
     */
    getNextAppletId(cb) {
        /** @type {boolean[]} */
        const ids = [];
        for (const tab of this.mainTabHost.tabs) {
            const app = tab.page;
            if (app instanceof AppletEntry) {
                ids[app.id] = true;
            }
        }
        this.getAllAppletInfo(infos => {
            for (const info of infos) {
                ids[info.id] = true;
            }
            cb(firstNonTrueSlot(ids));
        });
    }
    /**
     * @param {Applet} applet
     * @param {string} title
     * @param {() => void} [cb]
     */
    newApplet(applet, title, cb) {
        this.getNextAppletId(id => {
            this.mainTabHost.addTab(this.mainTabHost.createTab(new AppletEntry(this, applet, title, id))).select();
            if (cb) cb();
        });
    }
    getOpenedApplets() {
        /** @type {AppletEntry[]} */
        const ret = [];
        for (const app of this.mainTabHost.tabs) {
            if (app.page instanceof AppletEntry) {
                ret.push(app.page);
            }
        }
        return ret;
    }
    saveConfigData() {
        /** @type {any} */
        const data = {
            activeAppletId: null,
            openedAppletIds: this.getOpenedApplets().map(e => e.id),
        };
        if (this.mainTabHost.activeTab?.page instanceof AppletEntry) {
            data.activeAppletId = this.mainTabHost.activeTab.page.id;
        } else {
            data.activeAppletId = null;
        }
        this.requestDB(db => {
            const store = db.transaction(APPDATA_STORE, 'readwrite').objectStore(APPDATA_STORE);
            const req = store.put(data, APPDATA_KEY);
        });
    }
    /**
     * @param {number[]} ids
     * @param {() => void} [cb]
     */
    loadAndOpenApplets(ids, cb) {
        this.requestDB(db => {
            const store = db.transaction(APPLETS_STORE, 'readonly').objectStore(APPLETS_STORE);
            for (const id of ids) {
                const req = store.get(id);
                req.addEventListener('success', () => {
                    const result = req.result;
                    const applet = this.deserializeApplet(result, result.title, result.id);
                    if (applet !== null) {
                        this.mainTabHost.addTab(this.mainTabHost.createTab(applet));
                    }
                });
            }
        });
    }
    loadAppdata() {
        this.requestDB(db => {
            const appdata = db.transaction(APPDATA_STORE, 'readonly').objectStore(APPDATA_STORE);
            const appDataReq = appdata.get(APPDATA_KEY);
            appDataReq.addEventListener('success', () => {
                const data = appDataReq.result;
                const {activeAppletId, openedAppletIds} = data;
                if (Array.isArray(openedAppletIds)) {
                    this.loadAndOpenApplets(data.openedAppletIds, () => {
                        if (typeof activeAppletId === 'number') {
                            this.selectAppletById(activeAppletId);
                        }
                    });
                }
            });
        });
    }
    /**
     * @param {number} id
     */
    getAppletById(id) {
        for (const app of this.mainTabHost.tabs) {
            if (app.page instanceof AppletEntry && app.page.id === id) {
                return app;
            }
        }
        return null;
    }
    /**
     * @param {number} id
     */
    selectAppletById(id) {
        const applet = this.getAppletById(id);
        if (applet) applet.select();
    }
    /**
     * @param {(arg0: AppletInfo[]) => void} cb
     */
    getAllAppletInfo(cb) {
        this.requestDB(db => {
            /** @type {AppletInfo[]} */
            const ret = [];
            const store = db.transaction(APPLETS_STORE, 'readonly').objectStore(APPLETS_STORE);
            const req = store.openCursor();
            req.addEventListener('success', () => {
                const cursor = req.result;
                if (cursor) {
                    ret.push({title: cursor.value.title, id: Number(cursor.key)});
                    cursor.continue();
                } else {
                    cb(ret);
                }
            });
            req.addEventListener('error', () => cb([]));
        });
    }
}

/**
 * @param {boolean[]} arr
 */
function firstNonTrueSlot(arr) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== true) {
            return i;
        }
    }
    return arr.length;
}
