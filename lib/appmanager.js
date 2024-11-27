/** @import { Applet, AppletFactory, AppletInfo, Tabpage } from './types/app' */

import { button, href, html } from './domutils.js';
import { deserializeOrdinalExpander, enumeratorFactory, OrdinalListExpander, Y0SequenceOrdinalListExpander } from './enumerator.js';
import { TabEntry, TabHost } from './tabhost.js';
import { renderTexlite } from './texlite.js';

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
 * @param {string} title
 */
function titleToNode(title) {
    if (title.length === 0) {
        const ret = document.createElement('span');
        ret.className = 'untitled';
        ret.textContent = '[untitled]';
        return [ret];
    } else {
        return renderTexlite(title);
    }
}

/**
 * @implements {Tabpage}
 */
export class AppletEntry {
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

        /** @type {number} */
        this.scrollY = 0;

        /** @type {TabEntry | null} */
        this.entry = null;

        /** @type {boolean} */
        this.deleted = false;
    }
    /**
     * @param {TabEntry} entry
     */
    onCreate(entry) {
        this.entry = entry;
        entry.ondefocus.push(() => this.scrollY = window.scrollY);
        entry.onfocus.push(() => window.scrollTo({top: this.scrollY}));
        entry.onclose.push(() => {
            if (!this.deleted) {
                this.save();
            }
        });
        const tabHeader = document.createElement('div');
        tabHeader.className = 'tabheader';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.placeholder = 'Title';
        titleInput.value = this.title;
        tabHeader.append(button('Close', () => entry.close()), titleInput, button('Rename', () => {
            this.title = titleInput.value;
            this.save(() => entry.renderTitle());
        }));
        entry.tabHeader = tabHeader;

        this.applet.onCreate(this);
    }
    getTitle() {
        return titleToNode(this.title);
    }
    getRoot() {
        return this.applet.getRoot();
    }
    /**
     * @param {() => void} [cb]
     */
    save(cb) {
        this.app.requestDB(db => {
            const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
            const data = {id: this.id, title: this.title, scrollY: this.scrollY};
            this.applet.serialize(data);
            const req = store.put(data);
            if (cb) req.addEventListener('success', cb);
            // TODO: report error?
        });
    }
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

        this.root.append(html('h2', 'Introduction'), html('p', 'This site is a collection of useful tools (called applets) for exploring and studying ', href('ordinal numbers', 'https://en.wikipedia.org/wiki/Ordinal_number'), '. Its also a work in progress.'));

        this.root.append(html('h2', 'Applets'));

        const appletList = document.createElement('ul');
        appletList.append(html('li', this.appletButton('0-Y sequence enumerator', () => new OrdinalListExpander(new Y0SequenceOrdinalListExpander()))));
        this.root.append(appletList);

        this.root.append(html('h2', 'Existing documents'));
        /** @type {HTMLTableCaptionElement} */
        this.savedAppletList = document.createElement('tbody');
        this.root.append(html('table',
            html('thead',
                html('tr', html('th', 'Title'), html('th', 'Type'), html('th', 'Actions')),
            ),
            this.savedAppletList
        ));
    }
    /**
     * @param {TabEntry} entry
     */
    onCreate(entry) {
        entry.onfocus.push(() => this.refreshSavedApplets());
    }
    getTitle() {
        return [document.createTextNode('Welcome')];
    }
    getRoot() {
        return this.root;
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
            this.app.newApplet(creator(), '', () => this.refreshSavedApplets());
        });
        return btn;
    }
    refreshSavedApplets() {
        this.app.getAllAppletInfo(infos => {
            this.savedAppletList.replaceChildren();
            for (const info of infos) {
                const btnOpen = button('Op', () => {
                    this.app.openAppletId(info.id);
                });
                const btnDelete = button('-', () => {
                    this.app.confirmationDialogue('Delete this applet?', 'Yes', 'No', ret => {
                        if (ret) {
                            this.app.deleteApplet(info.id, () => elem.remove());
                        }
                    });
                });
                const elem = html('tr',
                    html('td', ...titleToNode(info.title)),
                    html('td', info.type),
                    html('td', btnOpen, btnDelete)
                );
                this.savedAppletList.appendChild(elem);
            }
        });
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

        const btnMenu = button('\u03A9' /* \Omega */, () => {
            if (this.appletTabList.isConnected) {
                this.appletTabList.remove();
                btnMenu.classList.remove('selected');
            } else {
                this.header.prepend(this.appletTabList);
                btnMenu.classList.add('selected');
            }
        });

        /** @type {HTMLUListElement} */
        this.appletTabList = document.createElement('ul');
        this.appletTabList.className = 'tablist';

        const tabHeaderContainer = document.createElement('div');
        const tabOtherContainer = document.createElement('div');
        this.header.append(tabHeaderContainer, tabOtherContainer);

        const menuContainer = document.createElement('div');
        menuContainer.append(btnMenu);
        menuContainer.classList.add('tablist');
        root.append(this.header, menuContainer, this.appContainer);

        /** @type {Map<string, AppletFactory>} */
        this.appletDeserializers = new Map();

        this.appletDeserializers.set('ordinal-enumerator', enumeratorFactory);

        /** @type {IDBDatabase | null} */
        this.db = null;
        /** @type {((db: IDBDatabase) => void)[]} */
        this.dbRequests = [];
        openDBRequest(db => {
            this.db = db;
            for (const r of this.dbRequests) {
                r(db);
            }
        });
        this.loadAppdata();

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

        this.mainTabHost = new TabHost(this.appletTabList, tabHeaderContainer, tabOtherContainer, this.appContainer);
        /** @type {WelcomeScreen} */
        this.welcomeScreen = new WelcomeScreen(this);
        this.mainTabHost.addTab(this.mainTabHost.createTab(this.welcomeScreen));

        this.migrantLocalStorageData();
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
            const applet = des.deserialize(data);
            if (applet) {
                const ret = new AppletEntry(this, applet, title, id);
                if (typeof data.scrollY === 'number') {
                    ret.scrollY = data.scrollY;
                }
                return ret;
            } else return null;
        }
        return null;
    }
    /**
     * @param {number} count
     * @param {(n: number[]) => void} cb
     */
    getNextAppletId(count, cb) {
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
            cb(firstNonTrueSlot(ids, count));
        });
    }
    /**
     * @param {Applet} applet
     * @param {string} title
     * @param {() => void} [cb]
     */
    newApplet(applet, title, cb) {
        this.getNextAppletId(1, ids => {
            this.mainTabHost.addTab(this.mainTabHost.createTab(new AppletEntry(this, applet, title, ids[0]))).select();
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
     * @param {(applet: AppletEntry) => void} [cb]
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
                        if (cb) cb(applet);
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
    getOpenedAppletById(id) {
        for (const app of this.mainTabHost.tabs) {
            if (app.page instanceof AppletEntry && app.page.id === id) {
                return app.page;
            }
        }
        return null;
    }
    /**
     * @param {number} id
     */
    selectAppletById(id) {
        const applet = this.getOpenedAppletById(id);
        if (applet && applet.entry) applet.entry.select();
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
                    const value = cursor.value;
                    const des = this.appletDeserializers.get(value.type);
                    if (des) {
                        const type = des.deserializeType(value);
                        ret.push({title: value.title, id: Number(cursor.key), type: type ?? '<null>'});
                        cursor.continue();
                    }
                } else {
                    cb(ret);
                }
            });
            req.addEventListener('error', () => cb([]));
        });
    }
    /**
     * @param {string} msg
     * @param {string} positive
     * @param {string} negative
     * @param {(ret: boolean) => void} cb
     */
    confirmationDialogue(msg, positive, negative, cb) {
        const dialogue = document.createElement('dialog');
        const btn = button(positive, () => {
            cb(true);
            dialogue.close();
            dialogue.remove();
        });
        const btnNo = button(negative, () => {
            cb(false);
            dialogue.close();
            dialogue.remove();
        });
        dialogue.append(html('p', msg), btn, btnNo);
        this.root.append(dialogue);
        dialogue.showModal();
    }
    /**
     * @param {number} id
     */
    openAppletId(id) {
        const applet = this.getOpenedAppletById(id);
        if (applet && applet.entry) {
            applet.entry.select();
        } else {
            this.loadAndOpenApplets([id], () => this.selectAppletById(id));
        }
    }
    /**
     * @param {number} id
     * @param {() => void} cb
     */
    deleteApplet(id, cb) {
        const applet = this.getOpenedAppletById(id);
        if (applet && applet.entry) {
            applet.deleted = true;
            applet.entry.close();
        }
        this.requestDB(db => {
            const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
            const req = store.delete(id);
            req.addEventListener('success', cb);
        });
    }
    migrantLocalStorageData() {
        const data0 = localStorage.getItem('appData');
        if (data0) {
            const data = JSON.parse(data0);
            if (Array.isArray(data.applets)) {
                const count = data.applets.length;
                this.getNextAppletId(count, ids => {
                    this.requestDB(db => {
                        const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
                        let done = 0;
                        for (let i = 0, a = data.applets; i < a.length; i++) {
                            /** @type {any} */
                            const app = {};
                            Object.assign(app, a[i]);
                            app.id = ids[i];
                            const req = store.put(app);
                            req.addEventListener('success', () => {
                                done++;
                                if (done >= count) {
                                    this.welcomeScreen.refreshSavedApplets();
                                    localStorage.removeItem('appData');
                                }
                            });
                        }
                    });
                });
            }
        }
    }
}

/**
 * @param {boolean[]} arr
 * @param {number} count
 */
function firstNonTrueSlot(arr, count) {
    /** @type {number[]} */
    const ret = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== true) {
            ret.push(i);
            count--;
            if (count <= 0) return ret;
        }
    }
    let i = arr.length;
    while (count > 0) {
        ret.push(i++);
        count--;
    }
    return ret;
}
