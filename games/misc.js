/**
 * Useful functions I've found that may end up being completely unused.
 */

/**
 * Build a shader program from a set of shader descriptions, e.g.
 * 
 *     const SHADER_SET = [
 *         {
 *             type: gl.VERTEX_SHADER,
 *             id: "pixel_vshader"
 *         },
 *         {
 *             type: gl.FRAGMENT_SHADER,
 *             id: "pixel_fshader"
 *         }
 *     ];
 * 
 * @param {*} shaderInfo 
 * @returns 
 */
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

/**
 * Compile a single shader source.
 * 
 * @param {*} id 
 * @param {*} type 
 * @returns 
 */
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
