const Utils = {
    rand: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),

    noise(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    },

    smoothNoise(x, y, seed = 0) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const a = this.noise(ix, iy, seed);
        const b = this.noise(ix + 1, iy, seed);
        const c = this.noise(ix, iy + 1, seed);
        const d = this.noise(ix + 1, iy + 1, seed);
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        return this.lerp(this.lerp(a, b, ux), this.lerp(c, d, ux), uy);
    },

    fbm(x, y, octaves = 4, seed = 0) {
        let val = 0, amp = 0.5, freq = 1;
        for (let i = 0; i < octaves; i++) {
            val += amp * this.smoothNoise(x * freq, y * freq, seed + i * 100);
            amp *= 0.5;
            freq *= 2;
        }
        return val;
    },

    hsl(h, s, l, a = 1) {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    },

    shadeColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
};
