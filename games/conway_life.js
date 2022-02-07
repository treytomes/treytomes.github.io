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
        this.data[x * 4 + y * this.stride + 0] = value;
        this.data[x * 4 + y * this.stride + 1] = value;
        this.data[x * 4 + y * this.stride + 2] = value;
        this.data[x * 4 + y * this.stride + 3] = value;
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
        this.texture = this.gl.createTexture();
        this.data = new Uint8Array(this.stride * this.height);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
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
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
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
            u_buffer: texture,
            u_width: this.width,
            u_height: this.height,
            u_time: time
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
    }
}

class ConwaysLifeGameCanvas extends GameCanvas {

    constructor() {
        super();
        this.stride = this.screenWidth * 4;
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
            uniform sampler2D u_buffer;
            uniform float u_width;
            uniform float u_height;
            uniform float u_time;

            float rand(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.223))) * 43758.5453123);
            }
        
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
                vec2 vp = vec2(v_texcoord.x, v_texcoord.y);
                
                vec4 tl = texture2D(u_buffer, vtl);
                vec4 tr = texture2D(u_buffer, vtr);
                vec4 bl = texture2D(u_buffer, vbl);
                vec4 br = texture2D(u_buffer, vbr);
                vec4 t = texture2D(u_buffer, vt);
                vec4 b = texture2D(u_buffer, vb);
                vec4 l = texture2D(u_buffer, vl);
                vec4 r = texture2D(u_buffer, vr);
                vec4 p = texture2D(u_buffer, v_texcoord);
                
                if (u_time < 1000.0) {
                    // Wait a bit to ensure both framebuffers get initialized with random data.
                    float c = rand(v_texcoord);
                    if (c >= 0.5) { c = 1.0; } else { c = 0.0; }
                    gl_FragColor = vec4(c, c, c, 1).rgba;
                } else {
                    float count = 0.0;
                    if (tl.r != 0.0) { count += 1.0; }
                    if (tr.r != 0.0) { count += 1.0; }
                    if (bl.r != 0.0) { count += 1.0; }
                    if (br.r != 0.0) { count += 1.0; }
                    if  (t.r != 0.0) { count += 1.0; }
                    if  (b.r != 0.0) { count += 1.0; }
                    if  (l.r != 0.0) { count += 1.0; }
                    if  (r.r != 0.0) { count += 1.0; }

                    if (p.r == 1.0) { // cell is alive
                        gl_FragColor = vec4(1, 0, 0, 1).rgba;
                        if ((count >= 2.0) && (count <= 3.0)) {
                            gl_FragColor = vec4(1, 1, 1, 1).rgba;
                        } else {
                            gl_FragColor = vec4(0, 0, 0, 1).rgba;
                        }
                    } else {
                        gl_FragColor = vec4(0, 1, 0, 1).rgba;
                        if ((count >= 3.0) && (count < 4.0)) {
                            gl_FragColor = vec4(1, 1, 1, 1).rgba;
                        } else {
                            gl_FragColor = vec4(0, 0, 0, 1).rgba;
                        }
                    }
                }
            }
        `;

        generatePalette();

        this.waves0 = new RenderTarget(gl, this.screenWidth, this.screenHeight);
        this.waves1 = new RenderTarget(gl, this.screenWidth, this.screenHeight);

        this.waves0.useShaders(VERTEX_SHADER, FRAGMENT_SHADER);
        this.waves1.useShaders(VERTEX_SHADER, FRAGMENT_SHADER);

        this.waves0.clear(128);
        this.waves1.clear(128);

        console.log(this.screenWidth, this.screenHeight)
    }
    
    onMouseDown(x, y, buttons) {
        if (buttons & 1) {
            this.waves0.setValue(x, y, 255);
            this.waves1.setValue(x, y, 255);
            this.waves0.refresh();
            this.waves1.refresh();
        }
    }
    
    onMouseMove(x, y, buttons) {
        if (buttons & 1) {
            this.waves0.setValue(x, y, 255);
            this.waves1.setValue(x, y, 255);
            this.waves0.refresh();
            this.waves1.refresh();
        }
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onUpdate(time) {
        this.waves0.begin(time, this.waves1.texture);
        this.waves0.end();

        this.waves1.begin(time, this.waves0.texture);
        this.waves1.end();
    }
    
    /**
     * 
     * @param {number} time Total elapsed milliseconds.
     */
    onRender(time) {
        //clearScreen(0);
        for (let x = 0, o = 0; x < this.screenWidth; x++, o += 4) {
            for (let y = 0; y < this.screenHeight; y++) {
                let r = this.waves0.data[o + y * this.stride + 0];
                let g = this.waves0.data[o + y * this.stride + 1];
                let b = this.waves0.data[o + y * this.stride + 2];
                let a = this.waves0.data[o + y * this.stride + 3];
                let c = getColor(r / 255 * 5, g / 255 * 5, b / 255 * 5);
                setPixel(x, y, c);
            }
        }
    }
}

function onWindowLoad() {
    initialize(new ConwaysLifeGameCanvas());
}

window.addEventListener('load', onWindowLoad, false);
