import {
    GameCanvas, clearScreen, setPixel, initialize,

    gl, FRAMEBUFFER_POSITIONS
} from './framework/bootstrap.js';

import { MoreMath } from './framework/MoreMath.js';
import { generatePalette, getColor } from './framework/radialPalette.js';

const DROP_HEIGHT = 16;
const DROP_RADIUS = 8;
const DAMPING_FACTOR = 7;
const DROP_SPEED = 300;
const ENABLE_DROPS = false;

/**
 * Manage a single byte-based render target.
 */
 class RenderTarget {

    /**
     * Create the render target.
     * @param {number} width 
     * @param {number} height 
     */
    constructor(gl, width, height) {
        this.gl = gl;
        this.textureIndex = 0;
        this.resize(width, height);
    }

    useShaders(vertex, fragment) {
        this.shader = twgl.createProgramInfo(this.gl, [vertex, fragment]);

        this.gl.useProgram(this.shader.program);
        let imageLoc = this.gl.getUniformLocation(this.shader.program, "u_image");
    
        // Tell it to use texture units 0 for the image.
        this.gl.uniform1i(imageLoc, 0);
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {void}
     */
    getValue(x, y) {
        return this.data[x + y * this.stride];
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} value 
     */
    setValue(x, y, value) {
        this.data[x + y * this.stride + 0] = value;
        this.data[x + y * this.stride + 1] = value;
        this.data[x + y * this.stride + 2] = value;
        this.data[x + y * this.stride + 3] = value;
    }

    /**
     * Fill the render buffer with a value.
     * 
     * @param {number} value 
     */
    clear(value = 0) {
        this.data = this.data.fill(value);
    }

    /**
     * Reload the render texture in video memory from the renderImage array.
     * 
     * Call this just before presenting the data to the screen, if you intend to do that.
     */
    refresh() {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.data);

        // Draw the image data to the frame buffer.
        let vertBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(FRAMEBUFFER_POSITIONS), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, FRAMEBUFFER_POSITIONS.length / 2);
    }

    /**
     * 
     * @param {numbe} width 
     * @param {number} height 
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.stride = width * 4;
        this.texture0 = this.gl.createTexture();
        this.texture1 = this.gl.createTexture();
        this.texture = this.texture0;
        this.data = new Uint8Array(this.stride * this.height);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture0);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture1);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data);

        // Create a depth buffer to use with the render texture.
        this.depthBuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_STENCIL, this.width, this.height);

        // Create the framebuffer.  Attach the texture and depth buffer to the framebuffer. 
        this.frameBuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, this.depthBuffer);
    }

    /**
     * Begin rendering to this target.
     * 
     * @param {number} time How much time has passed, in milliseconds, since the start.
     */
    begin(time, texture) {
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture0);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture0);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data);

        twgl.resizeCanvasToDisplaySize(this.gl.canvas);
        // this makes WebGL render to the texture and depthBuffer
        // all draw calls will render there instead of the canvas
        // until we bind something else.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);
        this.gl.viewport(0, 0, this.width, this.height);
        
        this.gl.useProgram(this.shader.program);
        //let timeLoc = this.gl.getUniformLocation(this.shader.program, "u_time");
        //this.gl.uniform1f(timeLoc, time * 10);
        //let imageLoc = gl.getUniformLocation(renderShader.program, "u_image");

        twgl.setUniforms(this.shader, {
            u_buffer0: (this.textureIndex == 0) ? this.texture1 : this.texture0,
            u_buffer1: texture,
            u_width: this.width,
            u_height: this.height,
            u_time: time * 10
        });
    }

    /**
     * Stop rendering to this target.
     * 
     * @param {number} time How much time has passed, in milliseconds, since the start.
     */
    end() {
        this.refresh();
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.data)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.textureIndex = 1 - this.textureIndex;
        this.texture = (this.textureIndex == 0) ? this.texture0 : this.texture1;
    }
}

class WaterRipplesGameCanvas extends GameCanvas {

    constructor() {
        super();
        
        //this.screenWidth = 640;
        //this.screenHeight = 480;

        this.lastDropTime = 0;
        
        //this.waves0 = new Float64Array(this.screenWidth * this.screenHeight);
        //this.waves1 = new Float64Array(this.screenWidth * this.screenHeight);

        //this.waves0 = new Int8Array(this.screenWidth * this.screenHeight);
        //this.waves1 = new Int8Array(this.screenWidth * this.screenHeight);

        this.activeBuffer = 0;
        this.stride = this.screenWidth * 4;
        this.pixels = new Uint8Array(this.screenWidth * this.stride);
    }

    getWaveValue(bufferIndex, x, y) {
        if (bufferIndex == 0) {
            return this.waves0.getValue(x, y); // [x + y * this.screenWidth];
        } else {
            return this.waves1.getValue(x, y); //[x + y * this.screenWidth];
        }
    }
    
    setWaveValue(bufferIndex, x, y, value) {
        if (bufferIndex == 0) {
            this.waves0.setValue(x, y, value); //[x + y * this.screenWidth] = value;
        } else {
            this.waves1.setValue(x, y, value); //[x + y * this.screenWidth] = value;
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
                        let value = 128 + Math.cos(dist * Math.PI / DROP_RADIUS) * height;
                        this.setWaveValue(this.activeBuffer, dx, dy, value);
                    }
                }
            }
        }
    }
    
    onInit() {
        const VERTEX_SHADER = `
            attribute vec4 a_position;
            varying vec2 v_texcoord;
            void main() {
                gl_Position = a_position;
                
                // assuming a unit quad for position we
                // can just use that for texcoords. Flip Y though so we get the top at 0
                //v_texcoord = a_position.xy * vec2(0.5, -0.5) + 0.5;
                v_texcoord = a_position.xy * vec2(0.5, 0.5) + 0.5;
            }    
        `;
        const FRAGMENT_SHADER = `
            precision mediump float;
            varying vec2 v_texcoord;
            uniform sampler2D u_buffer0;
            uniform sampler2D u_buffer1;
            uniform float u_width;
            uniform float u_height;
            uniform float u_time;

            void main() {
                float inc_x = 1.0 / u_width;
                float inc_y = 1.0 / u_height;

                vec2 vtl = vec2(v_texcoord.x - inc_x, v_texcoord.y - inc_y);
                vec2 vtr = vec2(v_texcoord.x + inc_x, v_texcoord.y - inc_y);
                vec2 vbl = vec2(v_texcoord.x - inc_x, v_texcoord.y + inc_y);
                vec2 vbr = vec2(v_texcoord.x + inc_x, v_texcoord.y + inc_y);
                vec2 vt = vec2(v_texcoord.x, v_texcoord.y - inc_y);
                vec2 vb = vec2(v_texcoord.x, v_texcoord.y + inc_y);
                vec2 vl = vec2(v_texcoord.x - inc_x, v_texcoord.y);
                vec2 vr = vec2(v_texcoord.x + inc_x, v_texcoord.y);
                
                vec4 tl = texture2D(u_buffer1, vtl);
                vec4 tr = texture2D(u_buffer1, vtr);
                vec4 bl = texture2D(u_buffer1, vbl);
                vec4 br = texture2D(u_buffer1, vbr);
                vec4 t = texture2D(u_buffer1, vt);
                vec4 b = texture2D(u_buffer1, vb);
                vec4 l = texture2D(u_buffer1, vl);
                vec4 r = texture2D(u_buffer1, vr);
                
                vec4 color = (tl + tr + bl + br + t + b + l + r) / 4.0 - texture2D(u_buffer0, v_texcoord);

                gl_FragColor = color.rgba;
                
                //vec4 color = texture2D(u_buffer0, v_texcoord);
                //gl_FragColor = color.rgba;
            }
        `;

        generatePalette();

        this.waves0 = new RenderTarget(gl, this.screenWidth, this.screenHeight);
        this.waves1 = new RenderTarget(gl, this.screenWidth, this.screenHeight);

        this.waves0.useShaders(VERTEX_SHADER, FRAGMENT_SHADER);
        this.waves1.useShaders(VERTEX_SHADER, FRAGMENT_SHADER);

        this.waves0.clear(128);
        this.waves1.clear(128);
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
        if (ENABLE_DROPS) {
            if (time - this.lastDropTime >= DROP_SPEED) {
                this.lastDropTime = time;
    
                let dx = Math.floor(Math.random() * this.screenWidth);
                let dy = Math.floor(Math.random() * this.screenHeight);
                this.putDrop(dx, dy, DROP_HEIGHT);
            }
        }
    
        let newBuffer = (this.activeBuffer == 0) ? 1 : 0;
    
        /*
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
                ) >> 2) - this.getWaveValue(newBuffer, x, y));
    
                // Damping.
                let value = this.getWaveValue(newBuffer, x, y)
                if ((value - 128) < 0.001) {
                    // Handle the floating-point errors.
                    value = 128;
                    this.setWaveValue(newBuffer, x, y, value);
                } else if (value != 0) {
                    value = Math.round(value - (value >> DAMPING_FACTOR));
                    this.setWaveValue(newBuffer, x, y, value);
                }
            }
        }
        */


        if (this.activeBuffer == 0) {
            this.waves0.begin(time, this.waves1.texture);
            this.waves0.end();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.waves0.frameBuffer);
            gl.readPixels(0, 0, this.waves0.width, this.waves0.height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            this.waves1.begin(time, this.waves0.texture);
            this.waves1.end();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.waves1.frameBuffer);
            gl.readPixels(0, 0, this.waves1.width, this.waves1.height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        
        this.activeBuffer = newBuffer;
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onRender(time) {
        clearScreen(0);
                
        for (let x = 0; x < this.screenWidth; x++) {
            for (let y = 0; y < this.screenHeight; y++) {
                ///*
                let r = this.waves0.data[x * 4 + y * this.stride + 0];
                let g = this.waves0.data[x * 4 + y * this.stride + 1];
                let b = this.waves0.data[x * 4 + y * this.stride + 2];
                let a = this.waves0.data[x * 4 + y * this.stride + 3];
                let c = getColor(r / 255 * 5, g / 255 * 5, b / 255 * 5);
                setPixel(x, y, c);
                //*/
                /*
                // This gives us the effect of water breaking the light.
                let xOffset = (this.getWaveValue(this.activeBuffer, x - 1, y) - this.getWaveValue(this.activeBuffer, x + 1, y)) / 8;
                let yOffset = (this.getWaveValue(this.activeBuffer, x, y - 1) - this.getWaveValue(this.activeBuffer, x, y + 1)) / 8;
    
                if ((xOffset != 0) || (yOffset != 0)) {
                    // Generate alpha.
                    let alpha = 200 - xOffset;
                    if (alpha < 0) alpha = 0;
                    if (alpha > 255) alpha = 254;
    
                    let c = (alpha / 255) * 5;
                    setPixel(x + xOffset, y + yOffset, getColor(c, c, c));
                }
                */
            }
        }
    }
}

function onWindowLoad() {
    initialize(new WaterRipplesGameCanvas());
}

window.addEventListener('load', onWindowLoad, false);
