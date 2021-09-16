import {
    PALETTE_SIZE, loadPalette,
    getPixel, setPixel,
    beginRender, endRender,
    initialize
} from './framework/bootstrap.js';

//const SCREEN_WIDTH = 320;
//const SCREEN_HEIGHT = 240;

// Standard SNES resolution.
const SCREEN_WIDTH = 256;
const SCREEN_HEIGHT = 224;

let step = 0;

/**
 * R=0-5, G=0-5, B=0-5
 */
function generateRadialPalette() {
    const BITS = 6;
    let colors = [];
    let n = 0;
    for (let r = 0; r < BITS; r++) {
        for (let g = 0; g < BITS; g++) {
            for (let b = 0; b < BITS; b++) {
                let rr = r * 255 / (BITS - 1);
                let gg = g * 255 / (BITS - 1);
                let bb = b * 255 / (BITS - 1);

                let mid = (rr * 30 + gg * 59 + bb * 11) / 100;

                let r1 = ~~(((rr + mid * 1) / 2) * 230 / 255 + 10);
                let g1 = ~~(((gg + mid * 1) / 2) * 230 / 255 + 10);
                let b1 = ~~(((bb + mid * 1) / 2) * 230 / 255 + 10);

                colors[n++] = [ r1, g1, b1 ];
            }
        }
    }
    loadPalette(colors);
}

function hsv2rgb(hue, saturation, brightness) {
    if (hue < 0) hue = 0;
    if (saturation < 0) saturation = 0;
    if (brightness < 0) brightness = 0;

    if (hue > 1) hue = 1;
    if (saturation > 1) saturation = 1;
    if (brightness > 1) brightness = 1;

    if (0 == saturation) {
        brightness = Math.floor(brightness * 255);
        return [brightness, brightness, brightness];
    }

    let fMax = 0;
    let fMid = 0;
    let fMin = 0;

    if (0.5 < brightness) {
        fMax = brightness - (brightness * saturation) + saturation;
        fMin = brightness + (brightness * saturation) - saturation;
    } else {
        fMax = brightness + (brightness * saturation);
        fMin = brightness - (brightness * saturation);
    }

    let iSextant = Math.floor(hue / 60);
    if (300 <= hue) {
        hue -= 360;
    }
    hue /= 60;
    hue -= 2 * Math.floor(((iSextant + 1) % 6) / 2.0);
    if (0 == (iSextant % 2)) {
        fMid = hue * (fMax - fMin) + fMin;
    } else {
        fMid = fMin - hue * (fMax - fMin);
    }

    switch (iSextant) {
        case 1:
            return [fMid, fMax, fMin];
        case 2:
            return [fMin, fMax, fMid];
        case 3:
            return [fMin, fMid, fMax];
        case 4:
            return [fMid, fMin, fMax];
        case 5:
            return [fMax, fMin, fMid];
        default:
            return [fMax, fMid, fMin];
    }
}

function plasma_small(x, y, t) {
    let v1 = Math.sin(x * 10 + t);

    let v2 = Math.sin(10 * (x * Math.sin(t / 2) + y * Math.cos(t / 3)) + t);

    let cx = x + 0.5 * Math.sin(t / 5);
    let cy = y + 0.5 * Math.cos(t / 3);
    let v3 = Math.sin(Math.sqrt(100 * (cx * cx + cy * cy) + 1) + t);

    let v_average = ((v1 + v2 + v3) / 3 + 1) / 2;

    return Math.sin(v_average * 15 * Math.PI);
}

function plasma_big(x, y, t)  {
    let v1 = Math.sin(x * 10 + t);

    let v2 = Math.sin(10 * (x * Math.sin(t / 2) + y * Math.cos(t / 3)) + t);

    let cx = x + 0.5 * Math.sin(t / 5);
    let cy = y + 0.5 * Math.cos(t / 3);
    let v3 = Math.sin(Math.sqrt(100 * (cx * cx + cy * cy) + 1) + t);

    let v_average = ((v1 + v2 + v3) / 3 + 1) / 2;

    return Math.sin(v_average * 5 * Math.PI);
}

function onInit() {
    generateRadialPalette();
}

/**
 * 
 * @param {number} time Total elapsed milliseconds.
 */
function onUpdate(time) {
    step = time / 1024;
}

/**
 * 
 * @param {number} time Total elapsed milliseconds.
 */
function onRender(time) {
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
            let px = -1.0 + 2 * (x / SCREEN_WIDTH);
            let py = -1.0 + 2 * (y / SCREEN_HEIGHT);

            let v_big = plasma_big(px, py, step);
            let v_small = plasma_small(px, py, step / 4);

            let h = 0.25 * (Math.sin(v_big / 2 + v_small) + 1);
            let s = 0.5 * (Math.sin(v_small) + 1);
            let v = ((Math.sin(v_big) + 1) / 2) * 0.125;

            let color = hsv2rgb(h, s, v);
            let r = color[0] * 5;
            let g = color[1] * 5;
            let b = color[2] * 5;

            setPixel(x + 0, y + 0, (r * 36 + g * 6 + b));
        }
    }
}

function onUpdateFrame(time) {
    onUpdate(time);
    requestAnimationFrame(onUpdateFrame);
}

function onRenderFrame(time) {
    beginRender(time);
    onRender(time);
    endRender(time);
    requestAnimationFrame(onRenderFrame);
}

function onWindowLoad() {
    initialize(SCREEN_WIDTH, SCREEN_HEIGHT);
    onInit();
    requestAnimationFrame(onRenderFrame);
    requestAnimationFrame(onUpdateFrame);
}

window.addEventListener("load", onWindowLoad, false);
