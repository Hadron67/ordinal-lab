const CC_OPEN_BRACE = '{'.charCodeAt(0);
const CC_CLOSE_BRACE = '}'.charCodeAt(0);
const CC_HAT = '^'.charCodeAt(0);
const CC_UNDERSCORE = '_'.charCodeAt(0);
const CC_BSLASH = '\\'.charCodeAt(0);
const CC_LOWER_A = 'a'.charCodeAt(0);
const CC_UPPER_A = 'A'.charCodeAt(0);
const CC_LOWER_Z = 'z'.charCodeAt(0);
const CC_UPPER_Z = 'Z'.charCodeAt(0);
const CC_SPACE = ' '.charCodeAt(0);
const CC_TAB = '\t'.charCodeAt(0);
const CC_CR = '\r'.charCodeAt(0);
const CC_LF = '\n'.charCodeAt(0);

/** @type {{[n: string]: string}} */
export const CHAR_CNAMES = {
    'alpha': '\u03B1',
    'beta': '\u03B2',
    'gamma': '\u03B2',
    'delta': '\u03B4',
    'omega': '\u03C9',
    'Omega': '\u03A9',
    'Pi': '\u03A0',
    'psi': '\u03C8',
    'phi': '\u03C6',
    'varphi': '\u{1D6D7}',
    'epsilon': '\u03B5',
    'Phi': '\u03A6',
    'chi': '\u03C7',
    'lambda': '\u03BB',
    'times': '\xd7',

    'aft': 'aft',
    'th': 'th'
};

/**
 * @param {number} ch
 */
function isLetterCode(ch) {
    return ch >= CC_UPPER_A && ch <= CC_UPPER_Z || ch >= CC_LOWER_A && ch <= CC_LOWER_Z;
}

/**
 * @param {number} ch
 */
function isWhitespace(ch) {
    return ch === CC_SPACE || ch === CC_TAB || ch === CC_CR || ch === CC_LF;
}

/**
 * @param {string | Node[]} nodes
 */
function nodeOrStringToNode(nodes) {
    if (typeof nodes === 'string') {
        return [nodes];
    } else return nodes;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} i
 */
function deleteElement(arr, i) {
    /** @type {T[]} */
    const ret = [];
    for (let j = 0; j < arr.length; j++) {
        if (j !== i) {
            ret.push(arr[j]);
        }
    }
    return ret;
}

/**
 * @param {string} input
 * @param {number[]} [markers]
 */
export function renderTexlite(input, markers) {
    let cursor = 0;

    return parseElements();

    function cc() {
        return input.charCodeAt(cursor);
    }
    function parseElements() {
        /** @type {Node[]} */
        const ret = [];
        let acc = '';

        /**
         * @param {Node[]} nodes
         */
        function emitNodes(nodes) {
            if (nodes.length > 0) {
                if (acc.length > 0) {
                    ret.push(document.createTextNode(acc));
                    acc = '';
                }
                ret.push(...nodes);
            }
        }

        emitNodes(checkCursor());
        while (cursor < input.length && cc() !== CC_CLOSE_BRACE) {
            const elem = parseElement();
            if (typeof elem === 'string') {
                acc += elem;
            } else {
                emitNodes(elem);
            }
            emitNodes(checkCursor());
        }
        emitNodes(checkCursor());
        if (acc.length > 0) {
            ret.push(document.createTextNode(acc));
        }
        return ret;
    }
    function parseElement() {
        switch (cc()) {
            case CC_OPEN_BRACE: {
                cursor++;
                const ret = parseElements();
                cursor++;
                return ret;
            }
            case CC_HAT: {
                cursor++;
                skipWhitespace();
                const elem = document.createElement('sup');
                elem.append(...checkCursor(), ...nodeOrStringToNode(parseElement()));
                return [elem];
            }
            case CC_UNDERSCORE: {
                cursor++;
                skipWhitespace();
                const elem = document.createElement('sub');
                elem.append(...checkCursor(), ...nodeOrStringToNode(parseElement()));
                return [elem];
            }
            case CC_BSLASH: {
                cursor++;
                const cname = parseCName();
                if (CHAR_CNAMES.hasOwnProperty(cname)) {
                    return CHAR_CNAMES[cname];
                } else return '\\' + cname;
            }
            default: {
                const ret = String.fromCharCode(cc());
                cursor++;
                return ret;
            }
        }
    }
    function parseCName() {
        let ret = '';
        while (cursor < input.length && isLetterCode(cc())) {
            ret += String.fromCharCode(cc());
            cursor++;
        }
        return ret;
    }
    function checkCursor() {
        if (markers !== void 0 && markers.length > 0) {
            for (let i = 0; i < markers.length; i++) {
                const m = markers[i];
                if (cursor >= m) {
                    markers = deleteElement(markers, i);
                    const marker = document.createElement('span');
                    marker.className = 'cursor-marker';
                    return [marker];
                }
            }
        }
        return [];
    }
    function skipWhitespace() {
        while (cursor < input.length && isWhitespace(cc())) {
            cursor++;
        }
    }
}