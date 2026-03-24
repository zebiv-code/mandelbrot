// ─── Mandelbrot computation ─────────────────────────────────────
// Uses smooth iteration count for continuous coloring

export function computeRow(y, width, height, centerX, centerY, scale, maxIter) {
    const results = new Float64Array(width);
    const aspect = width / height;
    const iy = (y / height - 0.5) * scale + centerY;

    for (let x = 0; x < width; x++) {
        const cx = (x / width - 0.5) * scale * aspect + centerX;
        const cy = iy;

        let zx = 0, zy = 0, zx2 = 0, zy2 = 0;
        let iter = 0;

        while (zx2 + zy2 <= 4 && iter < maxIter) {
            zy = 2 * zx * zy + cy;
            zx = zx2 - zy2 + cx;
            zx2 = zx * zx;
            zy2 = zy * zy;
            iter++;
        }

        if (iter === maxIter) {
            results[x] = -1; // in set
        } else {
            // Smooth iteration count
            const log2 = Math.log(2);
            const nu = Math.log(Math.log(Math.sqrt(zx2 + zy2)) / log2) / log2;
            results[x] = (iter + 1 - nu) / maxIter;
        }
    }
    return results;
}
