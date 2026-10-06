const Game = {
    map: null,
    buildings: [],
    units: [],
    resources: { gold: 500, wood: 300, stone: 200, food: 100 },
    population: 0,
    maxPopulation: 20,
    selectedBuilding: null,
    selectedUnit: null,
    buildMode: null,
    gameSpeed: 1,
    paused: false,
    gameOver: false,
    ai: { buildings: [], units: [], lastAttack: 0 },

    init() {
        this.map = new GameMap(64, 64);
        this.generateMap();
        this.createInitialBuildings();
        this.createInitialUnits();
    },

    generateMap() {
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const nx = x / this.map.width;
                const ny = y / this.map.height;
                const elevation = Utils.fbm(nx * 4, ny * 4, 4, 42);
                const moisture = Utils.fbm(nx * 3, ny * 3, 3, 137);

                let type = 'grass';
                if (elevation < 0.3) type = 'water';
                else if (elevation > 0.75) type = 'mountain';
                else if (moisture > 0.6) type = 'forest';

                if (type === 'mountain' && Utils.noise(x * 0.2, y * 0.2, 999) > 0.7) {
                    type = Utils.noise(x * 0.3, y * 0.3, 888) > 0.5 ? 'gold' : 'iron';
                }

                this.map.setTile(x * 32, y * 32, { x: x * 32, y: y * 32, type });
            }
        }
    },

    createInitialBuildings() {
        const cx = this.map.width * 16;
        const cy = this.map.height * 16;

        this.buildings.push({
            id: Date.now(), type: 'townhall', x: cx, y: cy,
            size: 64, health: 1000, maxHealth: 1000, owner: 'player'
        });

        this.buildings.push({
            id: Date.now() + 1, type: 'house', x: cx + 80, y: cy,
            size: 48, health: 200, maxHealth: 200, owner: 'player'
        });

        this.buildings.push({
            id: Date.now() + 2, type: 'house', x: cx - 80, y: cy,
            size: 48, health: 200, maxHealth: 200, owner: 'player'
        });

        const aiX = this.map.width * 32 - 200;
        const aiY = this.map.height * 32 - 200;
        this.ai.buildings.push({
            id: Date.now() + 3, type: 'townhall', x: aiX, y: aiY,
            size: 64, health: 1000, maxHealth: 1000, owner: 'ai'
        });
    },

    createInitialUnits() {
        const cx = this.map.width * 16;
        const cy = this.map.height * 16;

        for (let i = 0; i < 3; i++) {
            this.units.push({
                id: Date.now() + i, type: 'worker',
                x: cx + Utils.rand(-60, 60), y: cy + Utils.rand(-60, 60),
                size: 12, health: 50, maxHealth: 50, owner: 'player',
                targetX: null, targetY: null, state: 'idle'
            });
        }

        const aiX = this.map.width * 32 - 200;
        const aiY = this.map.height * 32 - 200;
        for (let i = 0; i < 2; i++) {
            this.ai.units.push({
                id: Date.now() + 100 + i, type: 'soldier',
                x: aiX + Utils.rand(-40, 40), y: aiY + Utils.rand(-40, 40),
                size: 14, health: 100, maxHealth: 100, owner: 'ai',
                targetX: null, targetY: null, state: 'idle'
            });
        }
    },

    update(dt) {
        if (this.paused || this.gameOver) return;

        dt *= this.gameSpeed;

        this.units.forEach(u => this.updateUnit(u, dt));
        this.ai.units.forEach(u => this.updateUnit(u, dt));

        this.updateAI(dt);
        this.checkVictory();
    },

    updateUnit(unit, dt) {
        if (unit.targetX !== null && unit.targetY !== null) {
            const dx = unit.targetX - unit.x;
            const dy = unit.targetY - unit.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 2) {
                const speed = unit.type === 'worker' ? 40 : 60;
                unit.x += (dx / dist) * speed * dt;
                unit.y += (dy / dist) * speed * dt;
            } else {
                unit.targetX = null;
                unit.targetY = null;
                unit.state = 'idle';
            }
        }

        if (unit.type === 'worker' && unit.state === 'idle') {
            const nearestResource = this.findNearestResource(unit);
            if (nearestResource) {
                unit.targetX = nearestResource.x;
                unit.targetY = nearestResource.y;
                unit.state = 'gathering';
            }
        }

        if (unit.state === 'gathering') {
            const tile = this.map.getTile(
                Math.floor(unit.x / 32) * 32,
                Math.floor(unit.y / 32) * 32
            );
            if (tile && (tile.type === 'forest' || tile.type === 'gold' || tile.type === 'iron')) {
                if (tile.type === 'forest') this.resources.wood += 0.5 * dt;
                if (tile.type === 'gold') this.resources.gold += 0.3 * dt;
                if (tile.type === 'iron') this.resources.stone += 0.3 * dt;
            }
        }
    },

    findNearestResource(unit) {
        const resources = ['forest', 'gold', 'iron'];
        let nearest = null;
        let minDist = Infinity;

        for (let y = 0; y < this.map.height; y += 2) {
            for (let x = 0; x < this.map.width; x += 2) {
                const tile = this.map.getTile(x * 32, y * 32);
                if (tile && resources.includes(tile.type)) {
                    const dist = Utils.dist(unit.x, unit.y, tile.x, tile.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = tile;
                    }
                }
            }
        }
        return nearest;
    },

    updateAI(dt) {
        this.ai.lastAttack += dt;

        if (this.ai.lastAttack > 30 && this.ai.units.length < 10) {
            const aiTownhall = this.ai.buildings.find(b => b.type === 'townhall');
            if (aiTownhall) {
                this.ai.units.push({
                    id: Date.now(), type: 'soldier',
                    x: aiTownhall.x + Utils.rand(-30, 30),
                    y: aiTownhall.y + Utils.rand(-30, 30),
                    size: 14, health: 100, maxHealth: 100, owner: 'ai',
                    targetX: this.map.width * 16, targetY: this.map.height * 16,
                    state: 'attacking'
                });
            }
            this.ai.lastAttack = 0;
        }

        this.ai.units.forEach(unit => {
            if (unit.state === 'attacking') {
                const target = this.findNearestPlayerUnit(unit);
                if (target) {
                    const dist = Utils.dist(unit.x, unit.y, target.x, target.y);
                    if (dist < 20) {
                        target.health -= 10 * dt;
                        if (target.health <= 0) {
                            this.units = this.units.filter(u => u.id !== target.id);
                            Render.addParticle(target.x, target.y, '255,0,0', 10);
                            Audio.playDeath();
                        }
                    } else {
                        unit.targetX = target.x;
                        unit.targetY = target.y;
                    }
                }
            }
        });
    },

    findNearestPlayerUnit(unit) {
        let nearest = null;
        let minDist = Infinity;
        this.units.forEach(u => {
            const dist = Utils.dist(unit.x, unit.y, u.x, u.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = u;
            }
        });
        return nearest;
    },

    buildBuilding(type, x, y) {
        const costs = {
            house: { wood: 50, stone: 20 },
            barracks: { wood: 100, stone: 50 },
            tower: { wood: 30, stone: 80 },
            farm: { wood: 40, stone: 10 },
            mine: { wood: 60, stone: 30 }
        };

        const cost = costs[type];
        if (!cost) return false;

        if (this.resources.wood < cost.wood || this.resources.stone < cost.stone) {
            return false;
        }

        this.resources.wood -= cost.wood;
        this.resources.stone -= cost.stone;

        const sizes = { house: 48, barracks: 64, tower: 40, farm: 56, mine: 48 };
        const healths = { house: 200, barracks: 400, tower: 300, farm: 150, mine: 250 };

        this.buildings.push({
            id: Date.now(), type, x, y,
            size: sizes[type], health: healths[type],
            maxHealth: healths[type], owner: 'player'
        });

        Render.addParticle(x, y, '255,200,0', 15);
        Audio.playBuild();
        return true;
    },

    trainUnit(type) {
        const costs = {
            worker: { food: 20, gold: 10 },
            soldier: { food: 30, gold: 20 },
            archer: { food: 25, gold: 15 },
            knight: { food: 50, gold: 40 }
        };

        const cost = costs[type];
        if (!cost) return false;

        if (this.resources.food < cost.food || this.resources.gold < cost.gold) {
            return false;
        }

        if (this.population >= this.maxPopulation) return false;

        this.resources.food -= cost.food;
        this.resources.gold -= cost.gold;
        this.population++;

        const townhall = this.buildings.find(b => b.type === 'townhall' && b.owner === 'player');
        if (!townhall) return false;

        const sizes = { worker: 12, soldier: 14, archer: 13, knight: 16 };
        const healths = { worker: 50, soldier: 100, archer: 70, knight: 150 };

        this.units.push({
            id: Date.now(), type,
            x: townhall.x + Utils.rand(-40, 40),
            y: townhall.y + Utils.rand(-40, 40),
            size: sizes[type], health: healths[type],
            maxHealth: healths[type], owner: 'player',
            targetX: null, targetY: null, state: 'idle'
        });

        Audio.playClick();
        return true;
    },

    checkVictory() {
        const playerTownhall = this.buildings.find(b => b.type === 'townhall' && b.owner === 'player');
        const aiTownhall = this.ai.buildings.find(b => b.type === 'townhall');

        if (!playerTownhall) {
            this.gameOver = true;
            Audio.playDefeat();
            UI.showMessage('Поражение! Ваш город разрушен.');
        } else if (!aiTownhall) {
            this.gameOver = true;
            Audio.playVictory();
            UI.showMessage('Победа! Вы уничтожили врага!');
        }
    }
};

class GameMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = new Map();
    }

    getTile(x, y) {
        return this.tiles.get(`${Math.floor(x / 32)},${Math.floor(y / 32)}`);
    }

    setTile(x, y, tile) {
        this.tiles.set(`${Math.floor(x / 32)},${Math.floor(y / 32)}`, tile);
    }
}
