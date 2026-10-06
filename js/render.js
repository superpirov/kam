const Render = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    particles: [],
    time: 0,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    worldToScreen(x, y) {
        return {
            x: (x - this.camera.x) * this.camera.zoom + this.width / 2,
            y: (y - this.camera.y) * this.camera.zoom + this.height / 2
        };
    },

    screenToWorld(x, y) {
        return {
            x: (x - this.width / 2) / this.camera.zoom + this.camera.x,
            y: (y - this.height / 2) / this.camera.zoom + this.camera.y
        };
    },

    clear() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    },

    drawTerrain(map) {
        const tileSize = 32 * this.camera.zoom;
        const startX = Math.floor((this.camera.x - this.width / 2 / this.camera.zoom) / 32) * 32;
        const startY = Math.floor((this.camera.y - this.height / 2 / this.camera.zoom) / 32) * 32;
        const endX = startX + this.width / this.camera.zoom + 64;
        const endY = startY + this.height / this.camera.zoom + 64;

        for (let y = startY; y < endY; y += 32) {
            for (let x = startX; x < endX; x += 32) {
                const tile = map.getTile(x, y);
                if (!tile) continue;
                const pos = this.worldToScreen(x, y);
                this.drawTile(pos.x, pos.y, tileSize, tile);
            }
        }
    },

    drawTile(x, y, size, tile) {
        const ctx = this.ctx;
        const colors = {
            grass: ['#2d5a27', '#3a7a34', '#4a8a44'],
            forest: ['#1a3a15', '#2a5a20', '#3a7a30'],
            water: ['#1a3a5a', '#2a5a7a', '#3a7a9a'],
            mountain: ['#4a4a4a', '#5a5a5a', '#6a6a6a'],
            gold: ['#8a6a2a', '#aa8a3a', '#caaa4a'],
            iron: ['#5a4a3a', '#6a5a4a', '#7a6a5a']
        };

        const colorSet = colors[tile.type] || colors.grass;
        const colorIdx = Utils.noise(tile.x * 0.1, tile.y * 0.1) * colorSet.length | 0;

        ctx.fillStyle = colorSet[colorIdx];
        ctx.fillRect(x, y, size + 1, size + 1);

        if (tile.type === 'forest') {
            ctx.fillStyle = '#0a2a0a';
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (tile.type === 'water') {
            const wave = Math.sin(this.time * 2 + tile.x * 0.1 + tile.y * 0.1) * 0.1 + 0.9;
            ctx.fillStyle = `rgba(100, 180, 255, ${0.2 * wave})`;
            ctx.fillRect(x, y, size + 1, size + 1);
        }

        if (tile.type === 'gold' || tile.type === 'iron') {
            ctx.fillStyle = tile.type === 'gold' ? '#ffd700' : '#c0c0c0';
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawBuilding(building) {
        const ctx = this.ctx;
        const pos = this.worldToScreen(building.x, building.y);
        const size = building.size * this.camera.zoom;

        ctx.save();
        ctx.translate(pos.x + size / 2, pos.y + size / 2);

        const colors = {
            townhall: { base: '#8B4513', roof: '#A0522D' },
            house: { base: '#DEB887', roof: '#D2691E' },
            barracks: { base: '#696969', roof: '#808080' },
            tower: { base: '#708090', roof: '#778899' },
            farm: { base: '#9ACD32', roof: '#6B8E23' },
            mine: { base: '#4a4a4a', roof: '#5a5a5a' }
        };

        const c = colors[building.type] || colors.house;

        ctx.fillStyle = c.base;
        ctx.fillRect(-size / 2, -size / 2, size, size);

        ctx.fillStyle = c.roof;
        ctx.beginPath();
        ctx.moveTo(-size / 2, -size / 2);
        ctx.lineTo(0, -size * 0.7);
        ctx.lineTo(size / 2, -size / 2);
        ctx.closePath();
        ctx.fill();

        if (building.health < building.maxHealth) {
            ctx.fillStyle = '#333';
            ctx.fillRect(-size / 2, size / 2 + 2, size, 4);
            ctx.fillStyle = building.health > building.maxHealth * 0.5 ? '#4CAF50' : '#f44336';
            ctx.fillRect(-size / 2, size / 2 + 2, size * (building.health / building.maxHealth), 4);
        }

        ctx.restore();
    },

    drawUnit(unit) {
        const ctx = this.ctx;
        const pos = this.worldToScreen(unit.x, unit.y);
        const size = unit.size * this.camera.zoom;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        const colors = {
            worker: '#FFD700',
            soldier: '#FF4444',
            archer: '#44FF44',
            knight: '#4444FF'
        };

        ctx.fillStyle = colors[unit.type] || '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (unit.health < unit.maxHealth) {
            ctx.fillStyle = '#333';
            ctx.fillRect(-size / 2, -size / 2 - 6, size, 3);
            ctx.fillStyle = unit.health > unit.maxHealth * 0.5 ? '#4CAF50' : '#f44336';
            ctx.fillRect(-size / 2, -size / 2 - 6, size * (unit.health / unit.maxHealth), 3);
        }

        ctx.restore();
    },

    drawParticles() {
        const ctx = this.ctx;
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            p.vy += 0.1;

            if (p.life <= 0) return false;

            const pos = this.worldToScreen(p.x, p.y);
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, p.size * this.camera.zoom, 0, Math.PI * 2);
            ctx.fill();

            return true;
        });
    },

    addParticle(x, y, color = '255,200,0', count = 5) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: Utils.rand(-2, 2),
                vy: Utils.rand(-3, 0),
                life: Utils.rand(0.5, 1),
                size: Utils.rand(2, 5),
                color
            });
        }
    },

    drawMinimap(map, buildings, units) {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        const w = canvas.width = 180;
        const h = canvas.height = 180;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        const scale = Math.min(w / map.width, h / map.height);

        for (let y = 0; y < map.height; y += 4) {
            for (let x = 0; x < map.width; x += 4) {
                const tile = map.getTile(x * 32, y * 32);
                if (!tile) continue;
                const colors = {
                    grass: '#2d5a27', forest: '#1a3a15', water: '#1a3a5a',
                    mountain: '#4a4a4a', gold: '#8a6a2a', iron: '#5a4a3a'
                };
                ctx.fillStyle = colors[tile.type] || '#2d5a27';
                ctx.fillRect(x * 32 * scale, y * 32 * scale, 4 * 32 * scale, 4 * 32 * scale);
            }
        }

        buildings.forEach(b => {
            ctx.fillStyle = b.owner === 'player' ? '#4CAF50' : '#f44336';
            ctx.fillRect(b.x * scale - 2, b.y * scale - 2, 4, 4);
        });

        units.forEach(u => {
            ctx.fillStyle = u.owner === 'player' ? '#4CAF50' : '#f44336';
            ctx.fillRect(u.x * scale - 1, u.y * scale - 1, 2, 2);
        });
    },

    update(dt) {
        this.time += dt;
    }
};
