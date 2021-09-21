import {
    GameCanvas,  getPixel, setPixel, initialize, hsv2rgb
} from './framework/bootstrap.js';

import { generatePalette, getColor } from './framework/radialPalette.js';

class SinPlasmaGameCanvas extends GameCanvas {
    constructor() {
        super();
    }

    onInit() {
        generatePalette();
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onUpdate(time) {
        this.step = time / 1024;
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onRender(time) {
        for (let x = 0; x < this.screenWidth; x++) {
            for (let y = 0; y < this.screenHeight; y++) {
                let px = -1.0 + 2 * (x / this.screenWidth);
                let py = -1.0 + 2 * (y / this.screenHeight);
    
                let v_big = this.plasma_big(px, py, this.step);
                let v_small = this.plasma_small(px, py, this.step / 4);
    
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

    plasma_small(x, y, t) {
        let v1 = Math.sin(x * 10 + t);
    
        let v2 = Math.sin(10 * (x * Math.sin(t / 2) + y * Math.cos(t / 3)) + t);
    
        let cx = x + 0.5 * Math.sin(t / 5);
        let cy = y + 0.5 * Math.cos(t / 3);
        let v3 = Math.sin(Math.sqrt(100 * (cx * cx + cy * cy) + 1) + t);
    
        let v_average = ((v1 + v2 + v3) / 3 + 1) / 2;
    
        return Math.sin(v_average * 15 * Math.PI);
    }
    
    plasma_big(x, y, t)  {
        let v1 = Math.sin(x * 10 + t);
    
        let v2 = Math.sin(10 * (x * Math.sin(t / 2) + y * Math.cos(t / 3)) + t);
    
        let cx = x + 0.5 * Math.sin(t / 5);
        let cy = y + 0.5 * Math.cos(t / 3);
        let v3 = Math.sin(Math.sqrt(100 * (cx * cx + cy * cy) + 1) + t);
    
        let v_average = ((v1 + v2 + v3) / 3 + 1) / 2;
    
        return Math.sin(v_average * 5 * Math.PI);
    }
}

function onWindowLoad() {
    initialize(new SinPlasmaGameCanvas());
}

window.addEventListener("load", onWindowLoad, false);
