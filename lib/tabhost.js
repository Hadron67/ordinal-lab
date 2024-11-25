/** @import { Tabpage } from './types/app' */

export class TabEntry {
    /**
     * @param {TabHost} host
     * @param {Tabpage} page
     */
    constructor(host, page) {
        /** @type {TabHost} */
        this.host = host;
        /** @type {Tabpage} */
        this.page = page;
        /** @type {HTMLLIElement} */
        this.headerElem = document.createElement('li');
        this.headerElem.appendChild(page.getTitle());
        this.headerElem.addEventListener('click', () => this.select());
    }
    select() {
        for (const tab of this.host.tabs) {
            tab.headerElem.classList.remove('selected');
        }
        this.headerElem.classList.add('selected');
        if (this.host.activeTab !== null) {
            this.host.activeTab = this;
            this.host.content.replaceChildren(this.page.getRoot());
        }
    }
}

export class TabHost {
    /**
     * @param {Element} tablist
     * @param {Element} content
     */
    constructor(tablist, content) {
        /** @type {Element} */
        this.tablist = tablist;
        /** @type {Element} */
        this.content = content;

        /** @type {TabEntry | null} */
        this.activeTab = null;

        /** @type {TabEntry[]} */
        this.tabs = [];
    }
    /**
     * @param {Tabpage} page
     */
    createTab(page) {
        return new TabEntry(this, page);
    }
    /**
     * @param {TabEntry} tab
     */
    addTab(tab) {
        this.tabs.push(tab);
        this.tablist.appendChild(tab.headerElem);
        if (this.activeTab === null) {
            this.activeTab = tab;
            tab.select();
        }
        return tab;
    }
}
