// ─── Color palettes ─────────────────────────────────────────────
// Each palette is a function(t) where t is 0..1, returning [r, g, b] 0..255

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpColor(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function gradient(stops, t) {
    t = Math.max(0, Math.min(1, t));
    const n = stops.length - 1;
    const i = Math.min(Math.floor(t * n), n - 1);
    const f = t * n - i;
    return lerpColor(stops[i], stops[i + 1], f);
}

export const palettes = {
    classic(t) {
        return gradient([
            [0, 7, 100], [32, 107, 203], [237, 255, 255],
            [255, 170, 0], [0, 2, 0], [0, 7, 100]
        ], t);
    },
    fire(t) {
        return gradient([
            [0, 0, 0], [128, 0, 0], [255, 100, 0],
            [255, 255, 50], [255, 255, 200], [0, 0, 0]
        ], t);
    },
    ocean(t) {
        return gradient([
            [0, 0, 30], [0, 40, 100], [0, 130, 180],
            [100, 220, 255], [220, 255, 255], [0, 0, 30]
        ], t);
    },
    grayscale(t) {
        const v = Math.floor(t * 255);
        return [v, v, v];
    },
    psychedelic(t) {
        const r = Math.floor(Math.sin(t * Math.PI * 6) * 127 + 128);
        const g = Math.floor(Math.sin(t * Math.PI * 6 + 2) * 127 + 128);
        const b = Math.floor(Math.sin(t * Math.PI * 6 + 4) * 127 + 128);
        return [r, g, b];
    }
};
