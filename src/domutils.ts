export function html(tag: string, ...children: (Node | string)[]) {
    const ret = document.createElement(tag);
    ret.append(...children);
    return ret;
}

export function li(...elems: (Node | string)[]) {
    const ret = document.createElement('li');
    ret.append(...elems);
    return ret;
}

export function href(text: string, link: string) {
    const ret = document.createElement('a');
    ret.href = link;
    ret.target = '_blank';
    ret.text = text;
    return ret;
}

export function button(text: string | Node, click: (this: HTMLButtonElement, ev: MouseEvent) => void) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.append(text);
    btn.addEventListener('click', click);
    return btn;
}

export function toggleButton(text: string, onclick: (b: boolean) => void) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', function() {
        const t = this.classList.toggle('selected');
        if (onclick) onclick(t);
    });
    return btn;
}

export function createTable<T>(arr: T[][], creator: (elem: T) => HTMLElement) {
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

export class ListView<D, T> {
    root: HTMLUListElement;
    elements: T[] = [];
    recycledElements: T[] = [];
    constructor(public readonly factory: () => T, public readonly adapter: (elem: T, data: T) => void) {
        this.root = document.createElement('ul');
    }
    add(data: T) {
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
