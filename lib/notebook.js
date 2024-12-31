export class Notebook {

}

export class NotebookCell {
    /**
     * @param {Notebook} parent
     */
    constructor(parent) {
        /** @type {Notebook} */
        this.parent = parent;
        /** @type {Notebook | null} */
        this.prev = null;
        /** @type {Notebook | null} */
        this.next = null;
    }
}