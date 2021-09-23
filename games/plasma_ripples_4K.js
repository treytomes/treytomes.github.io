import { MoreMath } from './framework/MoreMath.js';

// These are used to setup the quad buffer for rendering the image data to the framebuffer.
const QUAD_ARRAYS = {
    position: {
        numComponents: 2,
        data: [
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ],
    },
    texcoord: [
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
    ],
};

class GameCanvas {
    constructor(canvas = null) {
        this.canvas = canvas ?? document.querySelector('canvas');
    }

    onInit() {}
    onMouseDown(x, y, buttons) {}
    onMouseUp(x, y, buttons) {}
    onMouseMove(x, y, buttons) {}
    onUpdate(time) {}
    onRender(time) {}
}

let _instance = null;
let gl = null;
let canvasShader = null;
let quadBufferInfo = null;

/**
 * Generate the quad buffer for rendering the image data to the framebuffer.
 */
function initializeQuadBuffer() {
    // calls gl.createBuffer, gl.bindBuffer, gl.bufferData for each array
    quadBufferInfo = twgl.createBufferInfoFromArrays(gl, QUAD_ARRAYS);
}

function loadCanvasShader() {
    const VERTEX_SHADER = `
        attribute vec4 position;
        attribute vec2 texcoord;

        uniform mat4 u_matrix;

        varying vec2 v_texcoord;

        void main() {
            gl_Position = u_matrix * position;
            v_texcoord = texcoord;
        }
    `;
    const FRAGMENT_SHADER = `
        precision mediump float;

        #define PI 3.1415926538

        varying vec2 v_texcoord;
        uniform float u_time;
    
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        float plasma_small(float x, float y, float t) {
            float v1 = sin(x * 10.0 + t);
        
            float v2 = sin(10.0 * (x * sin(t / 2.0) + y * cos(t / 3.0)) + t);
        
            float cx = x + 0.5 * sin(t / 5.0);
            float cy = y + 0.5 * cos(t / 3.0);
            float v3 = sin(sqrt(100.0 * (cx * cx + cy * cy) + 1.0) + t);
        
            float v_average = ((v1 + v2 + v3) / 3.0 + 1.0) / 2.0;
        
            return sin(v_average * 15.0 * PI);
        }
        
        float plasma_big(float x, float y, float t)  {
            float v1 = sin(x * 10.0 + t);
        
            float v2 = sin(10.0 * (x * sin(t / 2.0) + y * cos(t / 3.0)) + t);
        
            float cx = x + 0.5 * sin(t / 5.0);
            float cy = y + 0.5 * cos(t / 3.0);
            float v3 = sin(sqrt(100.0 * (cx * cx + cy * cy) + 1.0) + t);
        
            float v_average = ((v1 + v2 + v3) / 3.0 + 1.0) / 2.0;
        
            return sin(v_average * 5.0 * PI);
        }
    
        void main() {
            float v_big = plasma_big(v_texcoord.x, v_texcoord.y, u_time);
            float v_small = plasma_small(v_texcoord.x, v_texcoord.y, u_time);

            float h = 0.25 * (sin(v_big / 2.0 + v_small) + 1.0);
            float s = 0.5 * (sin(v_small) + 1.0);
            float v = ((sin(v_big) + 1.0) / 2.0); // * 0.125;

            gl_FragColor = vec4(hsv2rgb(vec3(h, s, v)), 1).rgba;
        }

    `;

    // Compiles shaders, links program, looks up locations.
    canvasShader = twgl.createProgramInfo(gl, [VERTEX_SHADER, FRAGMENT_SHADER]);
}

/**
 * Render the framebuffer to the canvas.
 */
function present(time) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const displayWidth = gl.canvas.clientWidth;
    const displayHeight = gl.canvas.clientHeight;
    let drawWidth = displayWidth;
    let drawHeight = displayHeight;
    
    const m = twgl.m4.ortho(0, gl.canvas.clientWidth, 0, gl.canvas.clientHeight, -1, 1);
    twgl.m4.scale(m, [drawWidth, drawHeight, 1], m);
    
    gl.useProgram(canvasShader.program);
    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    twgl.setBuffersAndAttributes(gl, canvasShader, quadBufferInfo);
    // calls gl.uniformXXX, gl.activeTexture, gl.bindTexture
    twgl.setUniforms(canvasShader, {
        u_matrix: m,
        u_time: time * 0.001
    });
    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, quadBufferInfo);
}

function onUpdateFrame(time) {
    _instance.onUpdate(time);
    requestAnimationFrame(onUpdateFrame);
}

function onRenderFrame(time) {
    _instance.onRender();
    present(time);
    requestAnimationFrame(onRenderFrame);
}

function initialize(gameInstance) {
    _instance = gameInstance;
    gl = _instance.canvas.getContext('webgl');

    loadCanvasShader();
    initializeQuadBuffer();

    //_instance.canvas.addEventListener('resize', function() {
    //});

    _instance.canvas.addEventListener('mousedown', function(e) {
        _instance.onMouseDown(e.clientX, e.clientY, e.buttons);
    });

    _instance.canvas.addEventListener('mouseup', function(e) {
        _instance.onMouseUp(e.clientX, e.clientY, e.buttons);
    });

    _instance.canvas.addEventListener('mousemove', function(e) {
        _instance.onMouseMove(e.clientX, e.clientY, e.buttons);
    });

    _instance.canvas.addEventListener('touchstart', function(e) {
        mousePos = getTouchPos(canvas, e);
        for (let n = 0; n < e.touches.length; n++) {
            const touch = e.touches[n];
            _instance.onMouseMove(touch.clientX, touch.clientY, 1);
        }
    });

    _instance.canvas.addEventListener('touchend', function(e) {
        _instance.onMouseUp(null, null, 1);
    });

    _instance.canvas.addEventListener('touchmove', function(e) {
        for (let n = 0; n < e.touches.length; n++) {
            const touch = e.touches[n];
            _instance.onMouseMove(touch.clientX, touch.clientY, 1);
        }
    });

    _instance.onInit();
    requestAnimationFrame(onRenderFrame);
    requestAnimationFrame(onUpdateFrame);
}


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

    onInit() {
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
        /*
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
        */
    }
}

function onWindowLoad() {
    initialize(new PlasmaRipplesGameCanvas());
}

window.addEventListener("load", onWindowLoad, false);
