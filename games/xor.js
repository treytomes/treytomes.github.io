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
    let colors = [];
    let n = 0;
    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
                colors[n++] = [ 255 * r / 6.0, 255 * g / 6.0, 255 * b / 6.0 ];
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
