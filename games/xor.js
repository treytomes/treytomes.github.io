// View here: http://localhost/games/framework/

// TODO: Remove needed functions from this: https://github.com/greggman/twgl.js

// This was helpful: https://webgl2fundamentals.org/webgl/lessons/webgl-qna-how-to-get-pixelize-effect-in-webgl-.html

/*
TODO:
http://marcgg.com/blog/2016/11/21/chiptune-sequencer-multiplayer/
http://marcgg.com/blog/2016/11/01/javascript-audio/
https://webglfundamentals.org/
*/

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

function onInit() {
    generateRadialPalette();

    // Draw the initial image.
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
            setPixel(x, y, x ^ y);
        }
    }
}

/**
 * 
 * @param {number} time Total elapsed milliseconds.
 */
function onUpdate(time) {
    //console.log(time);
}

/**
 * 
 * @param {number} time Total elapsed milliseconds.
 */
function onRender(time) {
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
            setPixel(x, y, (getPixel(x, y) + 1) % PALETTE_SIZE);
        }
    }
}

function onUpdateFrame(time) {
    onUpdate(time);
    requestAnimationFrame(onUpdateFrame);
}

function onRenderFrame(time) {
    onUpdate(time);

    beginRender();
    onRender();
    endRender();
    requestAnimationFrame(onRenderFrame);
}

function onWindowLoad() {
    initialize(SCREEN_WIDTH, SCREEN_HEIGHT);
    onInit();
    requestAnimationFrame(onRenderFrame);
    requestAnimationFrame(onUpdateFrame);
}

window.addEventListener("load", onWindowLoad, false);
