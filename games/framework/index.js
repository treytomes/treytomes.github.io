// View here: http://localhost/games/framework/

// TODO: Remove needed functions from this: https://github.com/greggman/twgl.js

// This was helpful: https://webgl2fundamentals.org/webgl/lessons/webgl-qna-how-to-get-pixelize-effect-in-webgl-.html

/*
TODO:
http://marcgg.com/blog/2016/11/21/chiptune-sequencer-multiplayer/
http://marcgg.com/blog/2016/11/01/javascript-audio/
*/

const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 240;
const PALETTE_SIZE = 256;

const gl = document.querySelector("canvas").getContext("webgl");
let paletteTex = null;
let imageTex = null;
let canvasShader = null;
let renderTexture = null;
let depthBuffer = null;
let fb = null;

// The 256-color screen palette.
const PALETTE = new Uint8Array(PALETTE_SIZE * 4);

// The image representing our scren.
const RENDER_IMAGE = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT);

function buildShaderProgram(shaderInfo) {
    let program = gl.createProgram();

    shaderInfo.forEach(function(desc) {
        let shader = compileShader(desc.id, desc.type);

        if (shader) {
        gl.attachShader(program, shader);
        }
    });

    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log("Error linking shader program:");
        console.log(gl.getProgramInfoLog(program));
    }

    return program;
}

function compileShader(id, type) {
    let code = document.getElementById(id).firstChild.nodeValue;
    let shader = gl.createShader(type);

    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function loadPixelShader() {
    const SHADER_SET = [
        {
            type: gl.VERTEX_SHADER,
            id: "pixel_vshader"
        },
        {
            type: gl.FRAGMENT_SHADER,
            id: "pixel_fshader"
        }
    ];
    return buildShaderProgram(SHADER_SET);
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
    return twgl.createProgramInfo(gl, [VERTEX_SHADER, FRAGMENT_SHADER]);
}

function openFullscreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }

    // This chunk is superceded by the renderTexture scaling function.
    /*
    if (canvas.clientWidth > canvas.clientHeight) {
        canvas.width = canvas.height * (canvas.clientWidth / canvas.clientHeight);
    } else {
        canvas.height = canvas.width * (canvas.clientHeight / canvas.clientWidth);
    }
    */
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

function setPalette(index, r, g, b, a) {
    PALETTE[index * 4 + 0] = r;
    PALETTE[index * 4 + 1] = g;
    PALETTE[index * 4 + 2] = b;
    PALETTE[index * 4 + 3] = a;
}

/**
 * Get the palette index at a position.
 * 
 * @param {number} x 
 * @param {number} y 
 * @returns {number} The palette index at the given position.
 */
function getPixel(x, y) {
    return RENDER_IMAGE[y * SCREEN_WIDTH + x];
}

/**
 * Set a pixel to a palette index at a position.
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {number} color 
 */
function setPixel(x, y, color) {
    RENDER_IMAGE[y * SCREEN_WIDTH + x] = color;
}

function generateRadialPalette() {
    let n = 0;
    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
                setPalette(n++, 255 * r / 6.0, 255 * g / 6.0, 255 * b / 6.0);
            }
        }
    }    
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, SCREEN_WIDTH, SCREEN_HEIGHT, 0, gl.ALPHA, gl.UNSIGNED_BYTE, RENDER_IMAGE);
}

/**
 * Reload the render texture in video memory from the renderImage array.
 */
function refreshRenderImage() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, SCREEN_WIDTH, SCREEN_HEIGHT, 0, gl.ALPHA, gl.UNSIGNED_BYTE, RENDER_IMAGE);
}

/**
 * Draw the image data to the frame buffer.
 */
function refreshFrameBuffer() {
    //Setup a unit quad composed of 2 triangles.
    const POSITIONS = [
        1,  1,
        -1,  1,
        -1, -1,

        1,  1,
        -1, -1,
        1, -1,
    ];
    let vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(POSITIONS), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, POSITIONS.length / 2);
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
        drawHeight = displayHeight;
        drawWidth = SCREEN_WIDTH * drawHeight / SCREEN_HEIGHT;
    } else {
        drawWidth = displayWidth;
        drawHeight = SCREEN_HEIGHT * drawWidth / SCREEN_WIDTH;
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

function initializeQuadBuffer() {
    const quadArrays = {
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
    // calls gl.createBuffer, gl.bindBuffer, gl.bufferData for each array
    return twgl.createBufferInfoFromArrays(gl, quadArrays);
}

let renderShader = null;
let quadBufferInfo = null;

function initialize() {
    canvasShader = loadCanvasShader();

    generateRadialPalette();

    // Draw the initial image.
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
            setPixel(x, y, x ^ y);
        }
    }

    renderShader = loadPixelShader();

    quadBufferInfo = initializeQuadBuffer();

    // Make a pixel texture to match the requested screen size.
    renderTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SCREEN_WIDTH, SCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create a depth renderbuffer
    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, SCREEN_WIDTH, SCREEN_HEIGHT);

    // create a framebuffer
    fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture and depth buffer to the framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    initializePalette();
    initializeRenderImage();
}

function beginRender() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    // this makes WebGL render to the texture and depthBuffer
    // all draw calls will render there instead of the canvas
    // until we bind something else.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    gl.useProgram(renderShader);
    var imageLoc = gl.getUniformLocation(renderShader, "u_image");
    var paletteLoc = gl.getUniformLocation(renderShader, "u_palette");
    // Tell it to use texture units 0 and 1 for the image and palette.
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);
}

function endRender() {
    refreshRenderImage();
    refreshFrameBuffer();
    presentFrameBuffer();
}

/**
 * 
 * @param {number} time Time elapsed since last frame.
 */
function onUpdate(time) {

}

/**
 * 
 * @param {number} time Time elapsed since last frame.
 */
function onRender(time) {
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
            setPixel(x, y, (getPixel(x, y) + 1) % PALETTE_SIZE);
        }
    }
}

function onAnimationFrame(time) {
    time *= 0.001;

    onUpdate(time);

    beginRender();
    onRender();
    endRender();
    requestAnimationFrame(onAnimationFrame);
}

window.addEventListener("load", onWindowLoad, false);

function onWindowLoad() {
    initialize();
    requestAnimationFrame(onAnimationFrame);
}