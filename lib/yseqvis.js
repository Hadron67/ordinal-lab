/** @import { Y0MontagneImageConfig, Y0MontagneRow } from './yseq.types' */

const SVG = 'http://www.w3.org/2000/svg';

/**
 * @param {Y0MontagneRow[]} montagne
 * @param {Y0MontagneImageConfig} config
 */
export function generateY0Montagne(montagne, config) {
    const svg = document.createElementNS(SVG, 'svg');
    document.body.appendChild(svg);
    let width = 0;
    let height = 0;
    for (let i = 0; i < montagne.length; i++) {
        let rowWidth = config.paddingLeftRight;
        let maxTextHeight = 0;
        const baseY = height;
        const row = montagne[montagne.length - 1 - i];
        /** @type {string[]} */
        const paths = [];
        for (let j = 0, a = row.data; j < a.length; j++) {
            const centreX = config.paddingLeftRight + config.elemGap * j;
            const txt = document.createElementNS(SVG, 'text');
            txt.textContent = a[j].toString();
            svg.appendChild(txt);
            const bbox = txt.getBBox();
            if (bbox.height > maxTextHeight) {
                maxTextHeight = bbox.height;
            }
            txt.setAttribute('x', (rowWidth - bbox.width / 2).toString());
            txt.setAttribute('y', (baseY + bbox.height / 2).toString());
            txt.setAttribute('dominant-baseline', 'central');
            if (i < montagne.length - 1) {
                const targetY = baseY + bbox.height + config.linkCellHeight;
                paths.push('M', centreX.toString(), targetY.toString(), 'v', (-config.linkCellHeight).toString());
                const parentPtr = row.parentPtr[j];
                if (parentPtr !== null) {
                    const targetX = config.paddingLeftRight + config.elemGap * parentPtr;
                    paths.push('L', targetX.toString(), targetY.toString());
                }
            }
            rowWidth += config.elemGap;
        }
        if (paths.length > 0) {
            const path = document.createElementNS(SVG, 'path');
            path.setAttribute('d', paths.join(' '));
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'black');
            svg.appendChild(path);
        }
        if (rowWidth > width) {
            width = rowWidth;
        }
        height += maxTextHeight;
        if (i < montagne.length - 1) {
            height += config.linkCellHeight;
        }
    }
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.remove();
    return svg;
}