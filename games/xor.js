import {
    GameCanvas, PALETTE_SIZE, getPixel, setPixel,
    beginRender, endRender,
    initialize
} from './framework/bootstrap.js';

import { generatePalette, getColor } from './framework/radialPalette.js';

class XORGameCanvas extends GameCanvas {
    onInit() {
        generatePalette();
    
        // Draw the initial image.
        for (let x = 0; x < this.screenWidth; x++) {
            for (let y = 0; y < this.screenHeight; y++) {
                setPixel(x, y, x ^ y);
            }
        }
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onUpdate(time) {
        //console.log(time);
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onRender(time) {
        for (let x = 0; x < this.screenWidth; x++) {
            for (let y = 0; y < this.screenHeight; y++) {
                setPixel(x, y, (getPixel(x, y) + 1) % PALETTE_SIZE);
            }
        }
    }
    
}

function onWindowLoad() {
    initialize(new XORGameCanvas());
}

window.addEventListener("load", onWindowLoad, false);
