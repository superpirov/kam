const Audio = {
    ctx: null,
    enabled: true,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    },

    playTone(freq, duration, type = 'sine', volume = 0.1) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playClick() { this.playTone(800, 0.05, 'square', 0.05); },
    playBuild() { this.playTone(400, 0.15, 'triangle', 0.1); },
    playAttack() { this.playTone(200, 0.1, 'sawtooth', 0.08); },
    playDeath() { this.playTone(100, 0.3, 'sawtooth', 0.1); },
    playVictory() {
        [523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => this.playTone(f, 0.3, 'sine', 0.1), i * 150));
    },
    playDefeat() {
        [400, 350, 300, 200].forEach((f, i) =>
            setTimeout(() => this.playTone(f, 0.4, 'sawtooth', 0.08), i * 200));
    }
};
