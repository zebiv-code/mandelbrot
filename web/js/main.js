// ─── Main: render loop, controls, interaction ───────────────────
import { computeRow } from './mandelbrot.js';
import { palettes } from './palette.js';
import { GPURenderer } from './gpu-renderer.js';

const canvas = document.getElementById('c');
const paletteNames = ['classic', 'fire', 'ocean', 'grayscale', 'psychedelic'];

// Try GPU first
const gpu = new GPURenderer(canvas);
const useGPU = gpu.available;
const ctx = useGPU ? null : canvas.getContext('2d');

// View state
let centerX = -0.5, centerY = 0;
let scale = 3.5;
let maxIter = 200;
let paletteName = 'classic';

// CPU rendering state
let rendering = false;
let needsRender = true;
let currentRow = 0;
let imageData = null;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    needsRender = true;
}

function render() {
    if (useGPU) {
        if (needsRender) {
            needsRender = false;
            gpu.render(centerX, centerY, scale, maxIter, paletteNames.indexOf(paletteName));
        }
        requestAnimationFrame(render);
        return;
    }

    // CPU fallback — progressive row-by-row
    if (!needsRender && !rendering) {
        requestAnimationFrame(render);
        return;
    }

    if (needsRender) {
        needsRender = false;
        rendering = true;
        currentRow = 0;
        imageData = ctx.createImageData(canvas.width, canvas.height);
    }

    const palette = palettes[paletteName];
    const chunkSize = Math.max(4, Math.ceil(canvas.height / 60));
    const endRow = Math.min(currentRow + chunkSize, canvas.height);

    for (let y = currentRow; y < endRow; y++) {
        const row = computeRow(y, canvas.width, canvas.height, centerX, centerY, scale, maxIter);
        const offset = y * canvas.width * 4;

        for (let x = 0; x < canvas.width; x++) {
            const idx = offset + x * 4;
            const t = row[x];

            if (t < 0) {
                imageData.data[idx] = 0;
                imageData.data[idx + 1] = 0;
                imageData.data[idx + 2] = 0;
            } else {
                const [r, g, b] = palette(t);
                imageData.data[idx] = r;
                imageData.data[idx + 1] = g;
                imageData.data[idx + 2] = b;
            }
            imageData.data[idx + 3] = 255;
        }
    }

    currentRow = endRow;
    ctx.putImageData(imageData, 0, 0);

    if (currentRow >= canvas.height) {
        rendering = false;
    }

    requestAnimationFrame(render);
}

// ─── Interaction ────────────────────────────────────────────────
let dragging = false, dragStartX, dragStartY, dragCenterX, dragCenterY;

canvas.addEventListener('pointerdown', e => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragCenterX = centerX;
    dragCenterY = centerY;
    canvas.setPointerCapture(e.pointerId);
});

// Map client coords to normalized 0..1 using CSS size (not canvas pixel size)
function clientToNorm(cx, cy) {
    return [cx / window.innerWidth, cy / window.innerHeight];
}

canvas.addEventListener('pointermove', e => {
    const [nx, ny] = clientToNorm(e.clientX, e.clientY);
    const aspect = canvas.width / canvas.height;
    const mx = (nx - 0.5) * scale * aspect + centerX;
    const my = (ny - 0.5) * scale + centerY;
    document.getElementById('coords').textContent = `${mx.toFixed(12)}, ${my.toFixed(12)}i`;

    if (!dragging) return;
    const dx = (e.clientX - dragStartX) / window.innerWidth;
    const dy = (e.clientY - dragStartY) / window.innerHeight;
    centerX = dragCenterX - dx * scale * aspect;
    centerY = dragCenterY - dy * scale;
    needsRender = true;
});

canvas.addEventListener('pointerup', e => {
    if (dragging && Math.abs(e.clientX - dragStartX) < 3 && Math.abs(e.clientY - dragStartY) < 3) {
        const [nx, ny] = clientToNorm(e.clientX, e.clientY);
        const aspect = canvas.width / canvas.height;
        centerX = (nx - 0.5) * scale * aspect + centerX;
        centerY = (ny - 0.5) * scale + centerY;
        needsRender = true;
    }
    dragging = false;
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const [nx, ny] = clientToNorm(e.clientX, e.clientY);
    const aspect = canvas.width / canvas.height;
    const mx = (nx - 0.5) * scale * aspect + centerX;
    const my = (ny - 0.5) * scale + centerY;

    scale *= zoomFactor;
    centerX = mx - (nx - 0.5) * scale * aspect;
    centerY = my - (ny - 0.5) * scale;

    needsRender = true;
}, { passive: false });

// ─── Controls ───────────────────────────────────────────────────
const itersSlider = document.getElementById('iters');
const itersVal = document.getElementById('iters-val');

itersSlider.addEventListener('input', () => {
    maxIter = parseInt(itersSlider.value);
    itersVal.textContent = maxIter;
    needsRender = true;
});

document.getElementById('palette').addEventListener('change', e => {
    paletteName = e.target.value;
    needsRender = true;
});

document.getElementById('reset').addEventListener('click', () => {
    centerX = -0.5;
    centerY = 0;
    scale = 3.5;
    needsRender = true;
});

document.getElementById('save').addEventListener('click', () => {
    // For GPU: force a render to ensure buffer has current frame
    if (useGPU) {
        gpu.render(centerX, centerY, scale, maxIter, paletteNames.indexOf(paletteName));
    }
    const link = document.createElement('a');
    link.download = `mandelbrot-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// ─── Init ───────────────────────────────────────────────────────
window.addEventListener('resize', resize);
resize();
render();
