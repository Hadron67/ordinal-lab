
/**
 * @param {string} tag
 * @param {(Node | string)[]} children
 */
export function html(tag, ...children) {
    const ret = document.createElement(tag);
    ret.append(...children);
    return ret;
}

/**
 * @param {(Node | string)[]} elems
 */
export function li(...elems) {
    const ret = document.createElement('li');
    ret.append(...elems);
    return ret;
}

/**
 * @param {string} text
 * @param {string} link
 */
export function href(text, link) {
    const ret = document.createElement('a');
    ret.href = link;
    ret.target = '_blank';
    ret.text = text;
    return ret;
}

/**
 * @param {string | Node} text
 * @param {(this: HTMLButtonElement, ev: MouseEvent) => void} click
 */
export function button(text, click) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.append(text);
    btn.addEventListener('click', click);
    return btn;
}

/**
 * @param {string} text
 * @param {(b: boolean) => void} [onclick]
 */
export function toggleButton(text, onclick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', function() {
        const t = this.classList.toggle('selected');
        if (onclick) onclick(t);
    });
    return btn;
}

/**
 * @template T
 * @param {T[][]} arr
 * @param {(elem: T) => HTMLElement} creator
 */
export function createTable(arr, creator) {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    for (const row of arr) {
        const tr = document.createElement('tr');
        tr.append(...row.map(creator));
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
}

/**
 * @template D, T
 */
export class ListView {
    /**
     * @param {() => T} factory
     * @param {(elem: T, data: D) => void} adapter
     */
    constructor(factory, adapter) {
        /** @type {HTMLUListElement} */
        this.root = document.createElement('ul');
        /** @type {() => T} */
        this.factory = factory;
        /** @type {(elem: T, data: D) => void} */
        this.adapter = adapter;

        /** @type {T[]} */
        this.elements = [];
        /** @type {T[]} */
        this.recycledElements = [];
    }
    /**
     * @param {D} data
     */
    add(data) {
        let newItem = this.recycledElements.pop();
        if (newItem === void 0) {
            newItem = this.factory();
        }
        this.adapter(newItem, data);
        this.elements.push(newItem);
    }
    clear() {
        this.recycledElements.push(...this.elements);
        this.elements.length = 0;
    }
}
