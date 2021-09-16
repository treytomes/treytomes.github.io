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

class PerlinTerrainGenerator {
	constructor(persistence = 0, frequency = 0, amplitude = 0, octaves = 0, randomSeed = 0) {
		this.persistence = persistence;
		this.frequency = frequency;
		this.amplitude = amplitude;
		this.octaves = octaves;
		this.randomSeed = 2 + randomSeed * randomSeed;
	}

	interpolate(x, y, a) {
		let negA = 1.0 - a;
		let negASqr = negA * negA;
		let fac1 = 3.0 * (negASqr) - 2.0 * (negASqr * negA);
		let aSqr = a * a;
		let fac2 = 3.0 * aSqr - 2.0 * (aSqr * a);
		return x * fac1 + y * fac2; // add the weighted factors
	}

	noise(x, y) {
		let n = x + y * 57;
		n = (n << 13) ^ n;
		let t = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
		return 1.0 - t * 0.931322574615478515625e-9; // 1073741824.0);
	}

	getValue(x, y) {
		let Xint = Math.floor(x);
		let Yint = Math.floor(y);
		let Xfrac = x % 1; // x - Xint;
		let Yfrac = y % 1; // y - Yint;

        //console.log(x, y, Xint, Yint, Xfrac, Yfrac);

		// Noise values.
		let n01 = this.noise(Xint - 1, Yint - 1);
		let n02 = this.noise(Xint + 1, Yint - 1);
		let n03 = this.noise(Xint - 1, Yint + 1);
		let n04 = this.noise(Xint + 1, Yint + 1);
		let n05 = this.noise(Xint - 1, Yint);
		let n06 = this.noise(Xint + 1, Yint);
		let n07 = this.noise(Xint, Yint - 1);
		let n08 = this.noise(Xint, Yint + 1);
		let n09 = this.noise(Xint, Yint);

        //console.log([n01, n02, n03, n04, n05]);

		let n12 = this.noise(Xint + 2, Yint - 1);
		let n14 = this.noise(Xint + 2, Yint + 1);
		let n16 = this.noise(Xint + 2, Yint);

		let n23 = this.noise(Xint - 1, Yint + 2);
		let n24 = this.noise(Xint + 1, Yint + 2);
		let n28 = this.noise(Xint, Yint + 2);

		let n34 = this.noise(Xint + 2, Yint + 2);

		// Find the noise values of the four corners.
		let x0y0 = 0.0625 * (n01 + n02 + n03 + n04) + 0.125 * (n05 + n06 + n07 + n08) + 0.25 * (n09);
		let x1y0 = 0.0625 * (n07 + n12 + n08 + n14) + 0.125 * (n09 + n16 + n02 + n04) + 0.25 * (n06);
		let x0y1 = 0.0625 * (n05 + n06 + n23 + n24) + 0.125 * (n03 + n04 + n09 + n28) + 0.25 * (n08);
		let x1y1 = 0.0625 * (n09 + n16 + n28 + n34) + 0.125 * (n08 + n14 + n06 + n24) + 0.25 * (n04);

		// Interpolate between those values according to the x and y fractions.
		let v1 = this.interpolate(x0y0, x1y0, Xfrac); // interpolate in x direction (y)
		let v2 = this.interpolate(x0y1, x1y1, Xfrac); // interpolate in x direction (y+1)
		let fin = this.interpolate(v1, v2, Yfrac);    // interpolate in y direction

        //console.log(v1, v2, fin);

		return fin;
	}

	total(i, j) {
		// Properties of 1 octave (changing each loop).
		let t = 0.0;
		let amp = 1.0;
		let freq = this.frequency;

		for (let k = 0; k < this.octaves; k++) {
			t += this.getValue(j * freq + this.randomSeed, i * freq + this.randomSeed) * amp;
            //console.log(j * freq + this.randomSeed, i * freq + this.randomSeed);
			amp *= this.persistence;
			freq *= 2;
		}

		return t;
	}

	getHeight(x, y) {
		return this.amplitude * this.total(x, y);
	}

	generate(width, height) {
		let terrain = new Array(height);
		for (let y = 0; y < this.height; y++) {
            terrain[y] = new Array(width);
			for (let x = 0; x < this.width; x++) {
				terrain[y, x] = this.getHeight(x, y);
			}
		}
		return terrain;
	}

	generate(width, height, xOffset) {
		let terrain = new Array(height);
		for (let y = 0; y < this.height; y++) {
            terrain[y] = new Array(width);
			for (let x = 0; x < this.width; x++) {
				terrain[y][x] = this.getHeight(x + xOffset, y);
			}
		}
		return terrain;
	}
}

let perlin_v1 = {
    rand_vect: function(x, y) {
        let theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },

    dot_prod_grid: function(x, y, vx, vy) {
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        if (this.gradients[[vx,vy]]){
            g_vect = this.gradients[[vx,vy]];
        } else {
            g_vect = this.rand_vect(vx, vy);
            this.gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },

    smootherstep: function(x) {
        return 6*x**5 - 15*x**4 + 10*x**3;
    },

    interp: function(x, a, b) {
        return a + this.smootherstep(x) * (b-a);
    },

    seed: function() {
        this.gradients = {};
        this.memory = {};
    },

    get: function(x, y) {
        if (this.memory.hasOwnProperty([x,y]))
            return this.memory[[x,y]];
        let xf = Math.floor(x);
        let yf = Math.floor(y);

        //interpolate
        let tl = this.dot_prod_grid(x, y, xf,   yf);
        let tr = this.dot_prod_grid(x, y, xf+1, yf);
        let bl = this.dot_prod_grid(x, y, xf,   yf+1);
        let br = this.dot_prod_grid(x, y, xf+1, yf+1);

        let xt = this.interp(x-xf, tl, tr);
        let xb = this.interp(x-xf, bl, br);
        let v = this.interp(y-yf, xt, xb);

        this.memory[[x,y]] = v;
        return v;
    }
}

let perlin = {
    noise: function(x, y) {
		let n = x + y * 57;
		n = (n << 13) ^ n;
		let t = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
		return 1.0 - t * 0.931322574615478515625e-9; // 1073741824.0);
	},

    rand_vect: function(x, y) {
        let rnd = this.noise(x, y); // Math.random()
        let theta = rnd * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },

    dot_prod_grid: function(x, y, vx, vy) {
        let d_vect = {x: x - vx, y: y - vy};
        let g_vect = this.rand_vect(vx, vy);
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    
    interp: function(a, x, y) {
		let negA = 1.0 - a;
		let negASqr = negA * negA;
		let fac1 = 3.0 * (negASqr) - 2.0 * (negASqr * negA);
		let aSqr = a * a;
		let fac2 = 3.0 * aSqr - 2.0 * (aSqr * a);
		return x * fac1 + y * fac2; // add the weighted factors
    },

    get: function(x, y) {
        x = (x % 12);
        y = (y % 12);

        let xf = Math.floor(x);
        let yf = Math.floor(y);

        //interpolate
        let tl = this.dot_prod_grid(x, y, xf, yf);
        let tr = this.dot_prod_grid(x, y, xf+1, yf);
        let bl = this.dot_prod_grid(x, y, xf, yf+1);
        let br = this.dot_prod_grid(x, y, xf+1, yf+1);

        let xt = this.interp(x-xf, tl, tr);
        let xb = this.interp(x-xf, bl, br);
        let v = this.interp(y-yf, xt, xb) / 100;

        return v;
    },
}

// This is a port of Ken Perlin's Java code. The
// original Java code is at http://cs.nyu.edu/%7Eperlin/noise/.
// Note that in this version, a number from 0 to 1 is returned.
let PerlinNoise = new function() {

    this.noise = function(x, y, z) {
    
       var p = new Array(512)
       var permutation = [ 151,160,137,91,90,15,
       131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
       190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
       88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
       77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
       102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
       135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
       5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
       223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
       129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
       251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
       49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
       138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
       ];
       for (var i=0; i < 256 ; i++) 
     p[256+i] = p[i] = permutation[i]; 
    
          var X = Math.floor(x) & 255,                  // FIND UNIT CUBE THAT
              Y = Math.floor(y) & 255,                  // CONTAINS POINT.
              Z = Math.floor(z) & 255;
          x -= Math.floor(x);                                // FIND RELATIVE X,Y,Z
          y -= Math.floor(y);                                // OF POINT IN CUBE.
          z -= Math.floor(z);
          var    u = fade(x),                                // COMPUTE FADE CURVES
                 v = fade(y),                                // FOR EACH OF X,Y,Z.
                 w = fade(z);
          var A = p[X  ]+Y, AA = p[A]+Z, AB = p[A+1]+Z,      // HASH COORDINATES OF
              B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;      // THE 8 CUBE CORNERS,
    
          return scale(lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),  // AND ADD
                                         grad(p[BA  ], x-1, y  , z   )), // BLENDED
                                 lerp(u, grad(p[AB  ], x  , y-1, z   ),  // RESULTS
                                         grad(p[BB  ], x-1, y-1, z   ))),// FROM  8
                         lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),  // CORNERS
                                         grad(p[BA+1], x-1, y  , z-1 )), // OF CUBE
                                 lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                         grad(p[BB+1], x-1, y-1, z-1 )))));
       }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp( t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        var h = hash & 15;                      // CONVERT LO 4 BITS OF HASH CODE
        var u = h<8 ? x : y,                 // INTO 12 GRADIENT DIRECTIONS.
                v = h<4 ? y : h==12||h==14 ? x : z;
        return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
    } 
    function scale(n) { return (1 + n)/2; }
}

/**
 * R=0-5, G=0-5, B=0-5
 */
function generateRadialPalette() {
    const BITS = 6;
    let colors = [];
    let n = 0;
    for (let r = 0; r < BITS; r++) {
        for (let g = 0; g < BITS; g++) {
            for (let b = 0; b < BITS; b++) {
                let rr = r * 255 / (BITS - 1);
                let gg = g * 255 / (BITS - 1);
                let bb = b * 255 / (BITS - 1);

                let mid = (rr * 30 + gg * 59 + bb * 11) / 100;

                let r1 = ~~(((rr + mid * 1) / 2) * 230 / 255 + 10);
                let g1 = ~~(((gg + mid * 1) / 2) * 230 / 255 + 10);
                let b1 = ~~(((bb + mid * 1) / 2) * 230 / 255 + 10);

                colors[n++] = [ r1, g1, b1 ];
            }
        }
    }
    loadPalette(colors);
}

function onInit() {
    generateRadialPalette();
}

/**
 * 
 * @param {number} time Total elapsed milliseconds.
 */
function onUpdate(time) {
    step = time / 1024;
}

/**
 * 
 * @param {number} time Total elapsed milliseconds.
 */
function onRender(time) {
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
            let size = 32;
            let px = x / SCREEN_WIDTH * size;
            let py = y / SCREEN_HEIGHT * size;

            let pz = step;
            let v1 = Math.floor(PerlinNoise.noise(px + step, py, pz) * 5);
            let v2 = Math.floor(PerlinNoise.noise(px - step, py - step, pz) * 5);
            let v3 = Math.floor(PerlinNoise.noise(px, py + step, pz) * 5);

            let r = 1; // v1 * 0.5 + v2 * 0.1 + v3 * 0.1;
            let g = v1 * 0.4 + v2 * 0.3 + v3 * 0.1;
            let b = v1 * 0.1 + v2 * 0.4 + v3 * 0.5;

            setPixel(x, y, r * 36 + g * 6 + b);
        }
    }
}

function onUpdateFrame(time) {
    onUpdate(time);
    requestAnimationFrame(onUpdateFrame);
}

function onRenderFrame(time) {
    beginRender(time);
    onRender();
    endRender(time);
    requestAnimationFrame(onRenderFrame);
}

function onWindowLoad() {
    initialize(SCREEN_WIDTH, SCREEN_HEIGHT);
    onInit();
    requestAnimationFrame(onRenderFrame);
    requestAnimationFrame(onUpdateFrame);
}

window.addEventListener("load", onWindowLoad, false);

let step = 0;
