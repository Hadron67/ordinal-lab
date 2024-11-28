
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
 * @param {string} text
 * @param {(this: HTMLButtonElement, ev: MouseEvent) => void} click
 */
export function button(text, click) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', click);
    return btn;
}

/**
 * @param {string} text
 * @param {() => void} [onclick]
 */
export function toggleButton(text, onclick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', function() {
        this.classList.toggle('selected');
        if (onclick) onclick();
    });
    return btn;
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
