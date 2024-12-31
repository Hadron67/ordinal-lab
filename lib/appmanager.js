/** @import { Applet, AppletFactory, AppletInfo, Tabpage } from './types/app' */

import { button, href, html } from './domutils.js';
import { deserializeOrdinalExpander, enumeratorFactory, OrdinalListExpander, Y0SequenceOrdinalListExpander } from './enumerator.js';
import { TabEntry, TabHost } from './tabhost.js';
import { renderTexlite } from './texlite.js';

const APPLETS_STORE = 'applets';
const APPDATA_STORE = 'appdata';
const APPDATA_KEY = 'data';

/**
 * @param {(a: IDBDatabase | null) => void} cb
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
    req.addEventListener('error', function(ev) {
        cb(null);
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
        entry.onclose.push(() => {
            if (!this.deleted) {
                this.save();
            }
        });
        const tabHeader = document.createElement('div');
        tabHeader.className = 'app-menu-row';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.placeholder = 'Title';
        titleInput.value = this.title;
        tabHeader.append(button('Close', () => entry.close()), titleInput, button('Rename', () => {
            this.title = titleInput.value;
            this.save(() => entry.renderTitle());
        }));
        entry.tabHeader = html('div', tabHeader);

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
            if (db) {
                const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
                const scrollY = this.entry ? this.entry.getScrollY() : void 0;
                const data = {id: this.id, title: this.title, scrollY};
                this.applet.serialize(data);
                const req = store.put(data);
                if (cb) req.addEventListener('success', cb);
                // TODO: report error?
            }
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
        appletList.append(html('li', this.appletButton('0-Y/BMS enumerator', () => new OrdinalListExpander(new Y0SequenceOrdinalListExpander()))));
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
        this.root.append(html('p', button('Import', () => {
            if (!this.importDialogue.isConnected) {
                document.body.appendChild(this.importDialogue);
                this.importDialogue.showModal();
            }
        })));

        /** @type {HTMLDialogElement} */
        this.importDialogue = document.createElement('dialog');
        {
            const textInput = document.createElement('textarea');
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            this.importDialogue.append(
                html('div', textInput, button('Import text', () => {
                    this.app.importAppletData(JSON.parse(textInput.value), () => this.refreshSavedApplets());
                })),
                html('div', fileInput, button('Import file', () => {
                    if (fileInput.files && fileInput.files.length >= 1) {
                        fileInput.files.item(0)?.text().then(text => {
                            this.app.importAppletData(JSON.parse(text), () => this.refreshSavedApplets());
                        });
                    }
                })),
                button('Close', () => {
                    this.importDialogue.close();
                    this.importDialogue.remove();
                })
            );
        }
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
                const btnExport = button('Ex', () => this.app.exportApplet(info.id));
                const elem = html('tr',
                    html('td', ...titleToNode(info.title)),
                    html('td', info.type),
                    html('td', btnOpen, btnDelete, btnExport),
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
        this.header = document.createElement('nav');

        const btnMenu = button('\u03A9' /* \Omega */, () => {
            if (this.header.isConnected) {
                this.header.remove();
                btnMenu.classList.remove('selected');
            } else {
                document.body.insertBefore(this.header, menuBtnContainer);
                btnMenu.classList.add('selected');
            }
        });

        const appMenuContainer = document.createElement('div');
        appMenuContainer.classList.add('app-menu');

        /** @type {HTMLUListElement} */
        this.appletTabList = document.createElement('ul');
        this.appletTabList.className = 'tablist';

        const menuBtnContainer = document.createElement('div');
        menuBtnContainer.append(btnMenu);
        menuBtnContainer.classList.add('tablist');

        this.header.append(this.appletTabList);

        root.append(menuBtnContainer, this.appContainer);

        /** @type {Map<string, AppletFactory>} */
        this.appletDeserializers = new Map();

        this.appletDeserializers.set('ordinal-enumerator', enumeratorFactory);

        /** @type {IDBDatabase | null} */
        this.db = null;
        /** @type {((db: IDBDatabase | null) => void)[]} */
        this.dbRequests = [];
        openDBRequest(db => {
            this.db = db;
            for (const r of this.dbRequests) {
                r(db);
            }
        });
        this.openLoadScreen();

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

        /** @type {TabHost} */
        this.mainTabHost = new TabHost(this.appletTabList, this.header, this.appContainer);
        /** @type {WelcomeScreen} */
        this.welcomeScreen = new WelcomeScreen(this);
        this.mainTabHost.addTab(this.mainTabHost.createTab(this.welcomeScreen));

        this.migrantLocalStorageData();
    }
    /**
     * @param {(db: IDBDatabase | null) => void} cb
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
     */
    deserializeAndOpenApplet(data, title, id) {
        const des = this.appletDeserializers.get(data.type);
        if (des !== void 0) {
            const applet = des.deserialize(data);
            if (applet) {
                const ret = new AppletEntry(this, applet, title, id);
                const tab = this.mainTabHost.createTab(ret);
                if (typeof data.scrollY === 'number') {
                    tab.scrollY = data.scrollY;
                }
                this.mainTabHost.addTab(tab);
            }
        }
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
            if (db) {
                const store = db.transaction(APPDATA_STORE, 'readwrite').objectStore(APPDATA_STORE);
                const req = store.put(data, APPDATA_KEY);
            }
        });
    }
    /**
     * @param {number[]} ids
     * @param {(ok: boolean) => void} [cb]
     */
    loadAndOpenApplets(ids, cb) {
        this.requestDB(db => {
            if (db) {
                const store = db.transaction(APPLETS_STORE, 'readonly').objectStore(APPLETS_STORE);
                let count = 0;
                for (const id of ids) {
                    const req = store.get(id);
                    req.addEventListener('success', () => {
                        const result = req.result;
                        this.deserializeAndOpenApplet(result, result.title, result.id);
                        count++;
                        if (count >= ids.length && cb) {
                            cb(true);
                        }
                    });
                    req.addEventListener('error', () => {
                        count++;
                        if (count >= ids.length && cb) {
                            cb(true);
                        }
                    });
                }
            } else {
                if (cb) cb(false);
            }
        });
    }
    openLoadScreen() {
        const dialogue = document.createElement('dialog');
        dialogue.className = 'loading';
        this.root.append(dialogue);
        dialogue.showModal();
        this.loadAppdata(ok => {
            dialogue.close();
            dialogue.remove();
        });
    }
    /**
     * @param {(ok: boolean) => void} [cb]
     */
    loadAppdata(cb) {
        this.requestDB(db => {
            if (db) {
                const appdata = db.transaction(APPDATA_STORE, 'readonly').objectStore(APPDATA_STORE);
                const appDataReq = appdata.get(APPDATA_KEY);
                appDataReq.addEventListener('success', () => {
                    const data = appDataReq.result;
                    const {activeAppletId, openedAppletIds} = data;
                    if (Array.isArray(openedAppletIds) && openedAppletIds.length > 0) {
                        this.loadAndOpenApplets(openedAppletIds, () => {
                            if (typeof activeAppletId === 'number') {
                                this.selectAppletById(activeAppletId);
                            }
                            if (cb) cb(true);
                        });
                    } else {
                        if (cb) cb(true);
                    }
                });
                appDataReq.addEventListener('error', function(ev) {
                    if (cb) cb(false);
                });
            } else {
                if (cb) cb(false);
            }
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
            if (db) {
                /** @type {AppletInfo[]} */
                const ret = [];
                const store = db.transaction(APPLETS_STORE, 'readonly').objectStore(APPLETS_STORE);
                const req = store.openCursor();
                req.addEventListener('success', () => {
                    const cursor = req.result;
                    if (cursor) {
                        const value = cursor.value;
                        const des = this.appletDeserializers.get(value.type);
                        let type = 'unknown';
                        if (des) {
                            type = des.deserializeType(value) ?? '<null>';
                        }
                        ret.push({title: value.title ?? '', id: Number(cursor.key), type});
                        cursor.continue();
                    } else {
                        cb(ret);
                    }
                });
                req.addEventListener('error', () => cb([]));
            }
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
            if (db) {
                const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
                const req = store.delete(id);
                req.addEventListener('success', cb);
            }
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
                        if (db) {
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
                        }
                    });
                });
            }
        }
    }
    /**
     * @param {number} id
     */
    exportApplet(id) {
        this.requestDB(db => {
            if (db) {
                const store = db.transaction(APPLETS_STORE, 'readonly').objectStore(APPLETS_STORE);
                const req = store.get(id);
                req.addEventListener('success', () => {
                    const blob = new Blob([JSON.stringify(req.result)], {type: "octet/stream"});
                    const dialogue = document.createElement('dialog');
                    const link = document.createElement('a');
                    const title = String(req.result.title).replace(/ /g, '-').replace(/\\/g, '\\\\');
                    link.href = window.URL.createObjectURL(blob);
                    link.textContent = 'Download';
                    link.className = 'button';
                    link.download = title + '.json';
                    link.target = '_blank';
                    dialogue.append(link, button('Close', () => {
                        dialogue.close();
                        dialogue.remove();
                        window.URL.revokeObjectURL(link.href);
                    }));
                    document.body.append(dialogue);
                    dialogue.showModal();
                });
            }
        });
    }
    /**
     * @param {any} data
     * @param {() => void} [cb]
     */
    importAppletData(data, cb) {
        /** @type {any} */
        const data0 = {};
        Object.assign(data0, data);
        this.getNextAppletId(1, ids => {
            data0.id = ids[0];
            this.requestDB(db => {
                if (db) {
                    const store = db.transaction(APPLETS_STORE, 'readwrite').objectStore(APPLETS_STORE);
                    const req = store.put(data0);
                    req.addEventListener('success', () => {if (cb) cb()});
                }
            });
        });
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
