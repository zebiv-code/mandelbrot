// ─── GPU Mandelbrot renderer (WebGL) ────────────────────────────

const VERTEX_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT_SRC = `
precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform int uMaxIter;
uniform int uPalette;

vec3 palette_classic(float t) {
    vec3 a = vec3(0.0, 0.027, 0.392);
    vec3 b = vec3(0.125, 0.420, 0.796);
    vec3 c = vec3(0.929, 1.0, 1.0);
    vec3 d = vec3(1.0, 0.667, 0.0);
    vec3 e = vec3(0.0, 0.008, 0.0);
    float s = t * 5.0;
    if (s < 1.0) return mix(a, b, s);
    if (s < 2.0) return mix(b, c, s - 1.0);
    if (s < 3.0) return mix(c, d, s - 2.0);
    if (s < 4.0) return mix(d, e, s - 3.0);
    return mix(e, a, s - 4.0);
}

vec3 palette_fire(float t) {
    vec3 a = vec3(0.0);
    vec3 b = vec3(0.5, 0.0, 0.0);
    vec3 c = vec3(1.0, 0.392, 0.0);
    vec3 d = vec3(1.0, 1.0, 0.196);
    vec3 e = vec3(1.0, 1.0, 0.784);
    float s = t * 5.0;
    if (s < 1.0) return mix(a, b, s);
    if (s < 2.0) return mix(b, c, s - 1.0);
    if (s < 3.0) return mix(c, d, s - 2.0);
    if (s < 4.0) return mix(d, e, s - 3.0);
    return mix(e, a, s - 4.0);
}

vec3 palette_ocean(float t) {
    vec3 a = vec3(0.0, 0.0, 0.118);
    vec3 b = vec3(0.0, 0.157, 0.392);
    vec3 c = vec3(0.0, 0.510, 0.706);
    vec3 d = vec3(0.392, 0.863, 1.0);
    vec3 e = vec3(0.863, 1.0, 1.0);
    float s = t * 5.0;
    if (s < 1.0) return mix(a, b, s);
    if (s < 2.0) return mix(b, c, s - 1.0);
    if (s < 3.0) return mix(c, d, s - 2.0);
    if (s < 4.0) return mix(d, e, s - 3.0);
    return mix(e, a, s - 4.0);
}

vec3 palette_gray(float t) {
    return vec3(t);
}

vec3 palette_psychedelic(float t) {
    float r = sin(t * 6.28318 * 3.0) * 0.5 + 0.5;
    float g = sin(t * 6.28318 * 3.0 + 2.0) * 0.5 + 0.5;
    float b = sin(t * 6.28318 * 3.0 + 4.0) * 0.5 + 0.5;
    return vec3(r, g, b);
}

vec3 getColor(float t, int pal) {
    if (pal == 1) return palette_fire(t);
    if (pal == 2) return palette_ocean(t);
    if (pal == 3) return palette_gray(t);
    if (pal == 4) return palette_psychedelic(t);
    return palette_classic(t);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float aspect = uResolution.x / uResolution.y;
    float cx = (uv.x - 0.5) * uScale * aspect + uCenter.x;
    float cy = (uv.y - 0.5) * uScale + uCenter.y;

    // Flip Y so top of screen = positive imaginary
    cy = uCenter.y - (uv.y - 0.5) * uScale;

    float zx = 0.0, zy = 0.0, zx2 = 0.0, zy2 = 0.0;
    int iter = 0;

    for (int i = 0; i < 4000; i++) {
        if (i >= uMaxIter) break;
        if (zx2 + zy2 > 4.0) break;
        zy = 2.0 * zx * zy + cy;
        zx = zx2 - zy2 + cx;
        zx2 = zx * zx;
        zy2 = zy * zy;
        iter++;
    }

    if (iter >= uMaxIter) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // Smooth iteration count
        float log2 = log(2.0);
        float nu = log(log(sqrt(zx2 + zy2)) / log2) / log2;
        float t = (float(iter) + 1.0 - nu) / float(uMaxIter);
        t = fract(t * 3.0); // cycle palette for more color variation
        vec3 col = getColor(t, uPalette);
        gl_FragColor = vec4(col, 1.0);
    }
}
`;

function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
    }
    return s;
}

export class GPURenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
        if (!this.gl) return;

        const gl = this.gl;
        const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
        if (!vs || !fs) { this.gl = null; return; }

        this.prog = gl.createProgram();
        gl.attachShader(this.prog, vs);
        gl.attachShader(this.prog, fs);
        gl.linkProgram(this.prog);
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.prog));
            this.gl = null;
            return;
        }
        gl.useProgram(this.prog);

        // Full-screen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(this.prog, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        // Uniform locations
        this.uResolution = gl.getUniformLocation(this.prog, 'uResolution');
        this.uCenter = gl.getUniformLocation(this.prog, 'uCenter');
        this.uScale = gl.getUniformLocation(this.prog, 'uScale');
        this.uMaxIter = gl.getUniformLocation(this.prog, 'uMaxIter');
        this.uPalette = gl.getUniformLocation(this.prog, 'uPalette');
    }

    get available() { return !!this.gl; }

    render(centerX, centerY, scale, maxIter, paletteIndex) {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.uCenter, centerX, centerY);
        gl.uniform1f(this.uScale, scale);
        gl.uniform1i(this.uMaxIter, maxIter);
        gl.uniform1i(this.uPalette, paletteIndex);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
