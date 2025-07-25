/** @import { Applet, AppletFactory, AppletInfo, Tabpage } from './types/app' */

import { button, href, html } from './domutils.js';
import { deserializeOrdinalExpander, enumeratorFactory, OrdinalListExpander, Y0SequenceOrdinalListExpander } from './enumerator.js';
import { TabEntry, TabHost } from './tabhost.js';
import { renderTexlite } from './texlite.js';
import { Applet, AppletFactory, AppletInfo, Tabpage } from './types/app.js';

const APPLETS_STORE = 'applets';
const APPDATA_STORE = 'appdata';
const APPDATA_KEY = 'data';

function openDBRequest(cb: (a: IDBDatabase | null) => void) {
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

function titleToNode(title: string) {
    if (title.length === 0) {
        const ret = document.createElement('span');
        ret.className = 'untitled';
        ret.textContent = '[untitled]';
        return [ret];
    } else {
        return renderTexlite(title, []);
    }
}

export class AppletEntry implements Tabpage {
    entry: TabEntry | null = null;
    deleted = false;
    constructor(public app: App, public applet: Applet, public title: string, public id: number) {}
    onCreate(entry: TabEntry) {
        this.entry = entry;
        entry.onclose.push(() => {
            if (!this.deleted) {
                this.save(null);
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
    save(cb: (() => void) | null) {
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

class WelcomeScreen implements Tabpage {
    root = document.createElement('div');
    savedAppletList = document.createElement('tbody');
    importDialogue = document.createElement('dialog');
    constructor(public app: App) {
        this.root.classList.add('welcome');
        this.root.append(html('h2', 'Introduction'), html('p', 'This site is a collection of useful tools (called applets) for exploring and studying ', href('ordinal numbers', 'https://en.wikipedia.org/wiki/Ordinal_number'), '. Its also a work in progress.'));
        this.root.append(html('h2', 'Applets'));

        const appletList = document.createElement('ul');
        appletList.append(html('li', this.appletButton('0-Y/BMS enumerator', () => new OrdinalListExpander(new Y0SequenceOrdinalListExpander()))));
        this.root.append(appletList);

        this.root.append(html('h2', 'Existing documents'));
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
    onCreate(entry: TabEntry) {
        entry.onfocus.push(() => this.refreshSavedApplets());
    }
    getTitle() {
        return [document.createTextNode('Welcome')];
    }
    getRoot() {
        return this.root;
    }
    appletButton(text: string, creator: () => Applet) {
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
    appContainer = document.createElement('main');
    header = document.createElement('nav');
    appletTabList = document.createElement('ul');
    appletDeserializers: Map<string, AppletFactory> = new Map();
    db: IDBDatabase | null = null;
    dbRequests: ((db: IDBDatabase | null) => void)[] = [];
    enableAutoSave = true;
    autoSaver = setInterval(() => {
        this.saveConfigData();
        if (this.enableAutoSave) {
            for (const app of this.mainTabHost.tabs) {
                if (app.page instanceof AppletEntry) {
                    app.page.save(null);
                }
            }
        }
    }, 10000);
    mainTabHost = new TabHost(this.appletTabList, this.header, this.appContainer);
    welcomeScreen = new WelcomeScreen(this);
    constructor(public root: HTMLElement) {
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

        this.appletTabList.className = 'tablist';

        const menuBtnContainer = document.createElement('div');
        menuBtnContainer.append(btnMenu);
        menuBtnContainer.classList.add('tablist');

        this.header.append(this.appletTabList);

        root.append(menuBtnContainer, this.appContainer);

        this.appletDeserializers.set('ordinal-enumerator', enumeratorFactory);

        openDBRequest(db => {
            this.db = db;
            for (const r of this.dbRequests) {
                r(db);
            }
        });
        this.openLoadScreen();
        this.mainTabHost.addTab(this.mainTabHost.createTab(this.welcomeScreen));
        this.migrantLocalStorageData();
    }
    requestDB(cb: (db: IDBDatabase | null) => void) {
        if (this.db) {
            cb(this.db);
        } else {
            this.dbRequests.push(cb);
        }
    }
    deserializeAndOpenApplet(data: any, title: string, id: number) {
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
    getNextAppletId(count: number, cb: (n: number[]) => void) {
        const ids: boolean[] = [];
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
    newApplet(applet: Applet, title: string, cb: (() => void) | null) {
        this.getNextAppletId(1, ids => {
            this.mainTabHost.addTab(this.mainTabHost.createTab(new AppletEntry(this, applet, title, ids[0]))).select();
            if (cb) cb();
        });
    }
    getOpenedApplets() {
        const ret: AppletEntry[] = [];
        for (const app of this.mainTabHost.tabs) {
            if (app.page instanceof AppletEntry) {
                ret.push(app.page);
            }
        }
        return ret;
    }
    saveConfigData() {
        const data: any = {
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
    loadAndOpenApplets(ids: number[], cb: ((ok: boolean) => void) | null) {
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
    loadAppdata(cb: ((ok: boolean) => void) | null) {
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
    getOpenedAppletById(id: number) {
        for (const app of this.mainTabHost.tabs) {
            if (app.page instanceof AppletEntry && app.page.id === id) {
                return app.page;
            }
        }
        return null;
    }
    selectAppletById(id: number) {
        const applet = this.getOpenedAppletById(id);
        if (applet && applet.entry) applet.entry.select();
    }
    getAllAppletInfo(cb: (arg0: AppletInfo[]) => void) {
        this.requestDB(db => {
            if (db) {
                const ret: AppletInfo[] = [];
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
    confirmationDialogue(msg: string, positive: string, negative: string, cb: (ret: boolean) => void) {
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
    openAppletId(id: number) {
        const applet = this.getOpenedAppletById(id);
        if (applet && applet.entry) {
            applet.entry.select();
        } else {
            this.loadAndOpenApplets([id], () => this.selectAppletById(id));
        }
    }
    deleteApplet(id: number, cb: () => void) {
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
                                const app: any = {};
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
    exportApplet(id: number) {
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
    importAppletData(data: any, cb: (() => void) | null) {
        const data0: any = {};
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

function firstNonTrueSlot(arr: boolean[], count: number) {
    const ret: number[] = [];
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
