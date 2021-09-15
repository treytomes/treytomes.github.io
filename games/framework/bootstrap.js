/**
 * Use this to start up the framework.
 */

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

const PALETTE_SIZE = 256;

// The 256-color screen palette.
const PALETTE = new Uint8Array(PALETTE_SIZE * 4);

// Setup a unit quad composed of 2 triangles for rendering the framebuffer to the canvas.
const FRAMEBUFFER_POSITIONS = [
    1,  1,
    -1,  1,
    -1, -1,

    1,  1,
    -1, -1,
    1, -1,
];

let gl = null;
let renderImage = null;  // The image representing our scren.
let canvasShader = null;
let renderShader = null;
let quadBufferInfo = null;
let renderTexture = null;
let depthBuffer = null;
let fb = null;
let paletteTex = null;
let imageTex = null;

let _screenWidth = 320; // null;
let _screenHeight = 240; //null;

/**
 * Generate the quad buffer for rendering the image data to the framebuffer.
 */
function initializeQuadBuffer() {
    // calls gl.createBuffer, gl.bindBuffer, gl.bufferData for each array
    quadBufferInfo = twgl.createBufferInfoFromArrays(gl, QUAD_ARRAYS);
}

/**
 * Make a pixel texture to match the requested screen size.
 */
function initializeRenderTexture() {
    renderImage = new Uint8Array(_screenWidth * _screenHeight);
    renderTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _screenWidth, _screenHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/**
 * Create a depth buffer to use with the render texture.
 * 
 * @param {*} screenWidth 
 * @param {*} screenHeight 
 */
function initializeDepthBuffer() {
    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, _screenWidth, _screenHeight);
}

/**
 * Create the framebuffer.  Attach the texture and depth buffer to the framebuffer. 
 */
function initializeFramebuffer() {
    fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
}

function loadRenderShader() {
    const VERTEX_SHADER = `
        attribute vec4 a_position;
        varying vec2 v_texcoord;
        void main() {
            gl_Position = a_position;
            
            // assuming a unit quad for position we
            // can just use that for texcoords. Flip Y though so we get the top at 0
            v_texcoord = a_position.xy * vec2(0.5, -0.5) + 0.5;
        }    
    `;
    const FRAGMENT_SHADER = `
        precision mediump float;
        varying vec2 v_texcoord;
        uniform sampler2D u_image;
        uniform sampler2D u_palette;
            
        void main() {
            float index = texture2D(u_image, v_texcoord).a * 255.0;
            gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
        }
    `;

    renderShader = twgl.createProgramInfo(gl, [VERTEX_SHADER, FRAGMENT_SHADER]);

    gl.useProgram(renderShader.program);
    let imageLoc = gl.getUniformLocation(renderShader.program, "u_image");
    let paletteLoc = gl.getUniformLocation(renderShader.program, "u_palette");

    // Tell it to use texture units 0 and 1 for the image and palette.
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);
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
        varying vec2 v_texcoord;
        uniform sampler2D u_texture;
        void main() {
            gl_FragColor = texture2D(u_texture, v_texcoord);
        }
    `;

    // Compiles shaders, links program, looks up locations.
    canvasShader = twgl.createProgramInfo(gl, [VERTEX_SHADER, FRAGMENT_SHADER]);
}

/**
 * Upload the palette data to video memory.
 */
 function initializePalette() {
    paletteTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PALETTE_SIZE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, PALETTE);
}

/**
 * Reload the palette texture in video memory from the renderImage array.
 */
 function refreshPaletteImage() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PALETTE_SIZE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, PALETTE);
}

function setPalette(index, r, g, b, a = 255) {
    PALETTE[index * 4 + 0] = r;
    PALETTE[index * 4 + 1] = g;
    PALETTE[index * 4 + 2] = b;
    PALETTE[index * 4 + 3] = a;
    refreshPaletteImage();
}

function loadPalette(colors) {
    for (let index = 0; index < colors.length; index++) {
        let c = colors[index];
        let r = c[0];
        let g = c[1];
        let b = c[2];
        let a = (c.length > 3) ? c[3] : 255;

        PALETTE[index * 4 + 0] = r;
        PALETTE[index * 4 + 1] = g;
        PALETTE[index * 4 + 2] = b;
        PALETTE[index * 4 + 3] = a;
    }
    refreshPaletteImage();
}

/**
 * Upload the render image data to video memory.
 */
 function initializeRenderImage() {
    imageTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, _screenWidth, _screenHeight, 0, gl.ALPHA, gl.UNSIGNED_BYTE, renderImage);
}

/**
 * Get the palette index at a position.
 * 
 * @param {number} x 
 * @param {number} y 
 * @returns {number} The palette index at the given position.
 */
 function getPixel(x, y) {
    return renderImage[y * _screenWidth + x];
}

/**
 * Set a pixel to a palette index at a position.
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {number} color 
 */
function setPixel(x, y, color) {
    renderImage[y * _screenWidth + x] = color;
}

/**
 * Reload the render texture in video memory from the renderImage array.
 */
 function refreshRenderImage() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, _screenWidth, _screenHeight, 0, gl.ALPHA, gl.UNSIGNED_BYTE, renderImage);
}

/**
 * Draw the image data to the frame buffer.
 */
function refreshFrameBuffer() {
    let vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(FRAMEBUFFER_POSITIONS), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, FRAMEBUFFER_POSITIONS.length / 2);
}

/**
 * Render the framebuffer to the canvas.
 */
function presentFrameBuffer() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const displayWidth = gl.canvas.clientWidth;
    const displayHeight = gl.canvas.clientHeight;
    let drawWidth = 0;
    let drawHeight = 0;
    if (displayWidth > displayHeight) {
        // Most of the time the monitor will be horizontal.
        drawHeight = displayHeight;
        drawWidth = _screenWidth * drawHeight / _screenHeight;
    } else {
        // Sometimes the monitor will be vertical.
        drawWidth = displayWidth;
        drawHeight = _screenHeight * drawWidth / _screenWidth;
    }
    const m = twgl.m4.ortho(0, gl.canvas.clientWidth, 0, gl.canvas.clientHeight, -1, 1);
    twgl.m4.translate(m, [
        (displayWidth - drawWidth) / 2, 
        (displayHeight - drawHeight) / 2,
        0
    ], m);
    twgl.m4.scale(m, [drawWidth, drawHeight, 1], m);
    
    gl.useProgram(canvasShader.program);
    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    twgl.setBuffersAndAttributes(gl, canvasShader, quadBufferInfo);
    // calls gl.uniformXXX, gl.activeTexture, gl.bindTexture
    twgl.setUniforms(canvasShader, {
        u_matrix: m,
        u_texture: renderTexture,
    });
    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, quadBufferInfo);
}

function initialize(screenWidth, screenHeight) {
    gl = document.querySelector("canvas").getContext("webgl");

    _screenWidth = screenWidth;
    _screenHeight = screenHeight;

    loadCanvasShader();
    loadRenderShader();
    initializeQuadBuffer();

    initializeRenderTexture();
    initializeDepthBuffer();

    initializeFramebuffer();

    initializePalette();
    initializeRenderImage();
}

function beginRender() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    // this makes WebGL render to the texture and depthBuffer
    // all draw calls will render there instead of the canvas
    // until we bind something else.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, _screenWidth, _screenHeight);
    
    gl.useProgram(renderShader.program);
}

function endRender() {
    refreshRenderImage();
    refreshFrameBuffer();
    presentFrameBuffer();
}

export {
    PALETTE_SIZE, gl,
    setPalette, loadPalette,
    getPixel, setPixel,
    initialize, beginRender, endRender
};