const SVG = 'http://www.w3.org/2000/svg';

export function rightAngle() {
    const svg = document.createElementNS(SVG, 'svg');
    const path = document.createElementNS(SVG, 'path');
    const width = 10;
    const height = 10;
    svg.setAttribute('height', '10');
    svg.setAttribute('width', '10');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10');
    svg.appendChild(path);
    return svg;
}
