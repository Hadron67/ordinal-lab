const CC_OPEN_BRACE = '{'.charCodeAt(0);
const CC_CLOSE_BRACE = '}'.charCodeAt(0);
const CC_HAT = '^'.charCodeAt(0);
const CC_UNDERSCORE = '_'.charCodeAt(0);
const CC_BSLASH = '\\'.charCodeAt(0);
const CC_LOWER_A = 'a'.charCodeAt(0);
const CC_UPPER_A = 'A'.charCodeAt(0);
const CC_LOWER_Z = 'z'.charCodeAt(0);
const CC_UPPER_Z = 'Z'.charCodeAt(0);

/** @type {{[n: string]: string}} */
export const CHAR_CNAMES = {
    'omega': '\u03C9',
    'Omega': '\u03A9',
    'psi': '\u03C8',
    'phi': '\u03C6',
    'varphi': '\u{1D6D7}',
    'epsilon': '\u03B5',
    'Phi': '\u03A6',
    'chi': '\u03C7',
    'lambda': '\u03BB',
    'times': '\xd7',
};

/**
 * @param {number} ch
 */
function isLetterCode(ch) {
    return ch >= CC_UPPER_A && ch <= CC_UPPER_Z || ch >= CC_LOWER_A && ch <= CC_LOWER_Z;
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
 * @param {string} input
 */
export function renderTexlite(input) {
    let cursor = 0;

    return parseElements();

    function cc() {
        return input.charCodeAt(cursor);
    }
    function parseElements() {
        /** @type {Node[]} */
        const ret = [];
        let acc = '';

        while (cursor < input.length && cc() !== CC_CLOSE_BRACE) {
            const elem = parseElement();
            if (typeof elem === 'string') {
                acc += elem;
            } else {
                if (acc.length > 0) {
                    ret.push(document.createTextNode(acc));
                    acc = '';
                }
                ret.push(...elem);
            }
        }
        if (acc.length > 0) {
            ret.push(document.createTextNode(acc));
            acc = '';
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
                const elem = document.createElement('sup');
                elem.append(...nodeOrStringToNode(parseElement()));
                return [elem];
            }
            case CC_UNDERSCORE: {
                cursor++;
                const elem = document.createElement('sub');
                elem.append(...nodeOrStringToNode(parseElement()));
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
}