import {
    GameCanvas,  getPixel, setPixel, initialize, hsv2rgb, clearScreen
} from './framework/bootstrap.js';

import { generatePalette, getColor } from './framework/radialPalette.js';
import { PerlinNoise } from './framework/PerlinNoise.js';
import { MoreMath } from './framework/MoreMath.js';

const DROP_HEIGHT = 64;
const DROP_RADIUS = 8;
const DAMPING_FACTOR = 128; // 16;
const DROP_SPEED = 300;
const ENABLE_DROPS = false;

class PlasmaRipplesGameCanvas extends GameCanvas {
    constructor() {
        super();
        
        //this.screenWidth = 640;
        //this.screenHeight = 480;

        this.lastDropTime = 0;
        
        this.waves0 = new Float64Array(this.screenWidth * this.screenHeight);
        this.waves1 = new Float64Array(this.screenWidth * this.screenHeight);
        this.activeBuffer = 0;

        this.step = 0;
    }

    getWaveValue(bufferIndex, x, y) {
        if (!MoreMath.isInRange(x, 0, this.screenWidth) || !MoreMath.isInRange(y, 0, this.screenHeight)) {
            return 0;
        }
    
        if (bufferIndex == 0) {
            return this.waves0[x + y * this.screenWidth];
        } else {
            return this.waves1[x + y * this.screenWidth];
        }
    }
    
    setWaveValue(bufferIndex, x, y, value) {
        if (!MoreMath.isInRange(x, 0, this.screenWidth) || !MoreMath.isInRange(y, 0, this.screenHeight)) {
            return;
        }
    
        if (bufferIndex == 0) {
            this.waves0[x + y * this.screenWidth] = value;
        } else {
            this.waves1[x + y * this.screenWidth] = value;
        }
    }
    
    putDrop(x, y, height) {
        for (let i = -DROP_RADIUS; i <= DROP_RADIUS; i++) {
            for (let j = -DROP_RADIUS; j <= DROP_RADIUS; j++) {
                let dx = x + i;
                let dy = y + j;
                if (MoreMath.isInRange(dx, 0, this.screenWidth) && MoreMath.isInRange(dy, 0, this.screenHeight)) {
                    let dist = Math.sqrt(i * i + j * j);
                    if (dist < DROP_RADIUS) {
                        let value = Math.cos(dist * Math.PI / DROP_RADIUS) * height;
                        this.setWaveValue(this.activeBuffer, dx, dy, value);
                    }
                }
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

    onInit() {
        generatePalette();
    }
    
    onMouseDown(x, y, buttons) {
        if (buttons & 1) {
            this.putDrop(x, y, DROP_HEIGHT);
        }
    }
    
    onMouseMove(x, y, buttons) {
        if (buttons & 1) {
            this.putDrop(x, y, DROP_HEIGHT);
        }
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onUpdate(time) {
        this.step = time / 1024;

        if (ENABLE_DROPS) {
            if (time - this.lastDropTime >= DROP_SPEED) {
                this.lastDropTime = time;
    
                let dx = Math.floor(Math.random() * this.screenWidth);
                let dy = Math.floor(Math.random() * this.screenHeight);
                this.putDrop(dx, dy, DROP_HEIGHT);
            }
        }
    
        let newBuffer = (this.activeBuffer == 0) ? 1 : 0;
    
        for (let x = 0; x < this.screenWidth; x++) {
            for (let y = 0; y < this.screenHeight; y++) {
                this.setWaveValue(newBuffer, x, y, ((
                    this.getWaveValue(this.activeBuffer, x - 1, y - 1) +
                    this.getWaveValue(this.activeBuffer, x, y - 1) +
                    this.getWaveValue(this.activeBuffer, x + 1, y - 1) +
                    this.getWaveValue(this.activeBuffer, x - 1, y) +
                    this.getWaveValue(this.activeBuffer, x + 1, y) +
                    this.getWaveValue(this.activeBuffer, x - 1, y + 1) +
                    this.getWaveValue(this.activeBuffer, x, y + 1) +
                    this.getWaveValue(this.activeBuffer, x + 1, y + 1)
                ) / 4) - this.getWaveValue(newBuffer, x, y));
    
                // Damping.
                let value = this.getWaveValue(newBuffer, x, y)
                if (value < 0.001) {
                    // Handle the floating-point errors.
                    value = 0;
                    this.setWaveValue(newBuffer, x, y, value);
                } else if (value != 0) {
                    value = Math.round(value - value / DAMPING_FACTOR);
                    this.setWaveValue(newBuffer, x, y, value);
                }
            }
        }
        this.activeBuffer = newBuffer;
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onRender(time) {
        for (let x = 0; x < this.screenWidth; x++) {
            for (let y = 0; y < this.screenHeight; y++) {
                // Adding the wave offset to the color calculation
                // gives us the effect of water breaking the light.

                let xOffset = (this.getWaveValue(this.activeBuffer, x - 1, y) - this.getWaveValue(this.activeBuffer, x + 1, y)) / 8;
                let yOffset = (this.getWaveValue(this.activeBuffer, x, y - 1) - this.getWaveValue(this.activeBuffer, x, y + 1)) / 8;
                
                let px = -1.0 + 2 * ((x + xOffset) / this.screenWidth);
                let py = -1.0 + 2 * ((y + yOffset) / this.screenHeight);
    
                let v_big = this.plasma_big(px, py, this.step);
                let v_small = this.plasma_small(px, py, this.step / 4);
    
                let h = 0.25 * (Math.sin(v_big / 2 + v_small) + 1);
                let s = 0.5 * (Math.sin(v_small) + 1);
                let v = ((Math.sin(v_big) + 1) / 2) * 0.125;
    
                let color = hsv2rgb(h, s, v);
                let r = color[0] * 5;
                let g = color[1] * 5;
                let b = color[2] * 5;
                setPixel(x, y, getColor(r, g, b));
            }
        }
    }
}

function onWindowLoad() {
    initialize(new PlasmaRipplesGameCanvas());
}

window.addEventListener("load", onWindowLoad, false);
