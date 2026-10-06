const Main = {
    lastTime: 0,

    init() {
        const canvas = document.getElementById('game-canvas');
        Render.init(canvas);
        Audio.init();
        Game.init();
        UI.init();

        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('wheel', (e) => this.onWheel(e));
        window.addEventListener('keydown', (e) => this.onKeyDown(e));

        this.gameLoop(0);
    },

    onMouseDown(e) {
        if (Game.gameOver) return;

        const rect = e.target.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPos = Render.screenToWorld(screenX, screenY);

        if (e.button === 0) {
            if (Game.buildMode) {
                if (Game.buildBuilding(Game.buildMode, worldPos.x, worldPos.y)) {
                    UI.updateResources();
                }
                Game.buildMode = null;
                UI.updateBuildMenu();
            } else {
                this.selectUnit(worldPos.x, worldPos.y);
            }
        } else if (e.button === 2) {
            Game.units.forEach(unit => {
                if (unit.owner === 'player' && unit.state === 'selected') {
                    unit.targetX = worldPos.x;
                    unit.targetY = worldPos.y;
                    unit.state = 'idle';
                }
            });
        }
    },

    onMouseMove(e) {
        // TODO: hover effects
    },

    onWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        if (e.deltaY < 0) {
            Render.camera.zoom = Math.min(2, Render.camera.zoom + zoomSpeed);
        } else {
            Render.camera.zoom = Math.max(0.5, Render.camera.zoom - zoomSpeed);
        }
    },

    onKeyDown(e) {
        const panSpeed = 20;
        switch (e.key) {
            case 'w': case 'ArrowUp': Render.camera.y -= panSpeed; break;
            case 's': case 'ArrowDown': Render.camera.y += panSpeed; break;
            case 'a': case 'ArrowLeft': Render.camera.x -= panSpeed; break;
            case 'd': case 'ArrowRight': Render.camera.x += panSpeed; break;
            case ' ': Render.camera.x = Game.map.width * 16; Render.camera.y = Game.map.height * 16; break;
            case '1': Game.buildMode = 'house'; UI.updateBuildMenu(); break;
            case '2': Game.buildMode = 'barracks'; UI.updateBuildMenu(); break;
            case '3': Game.buildMode = 'tower'; UI.updateBuildMenu(); break;
            case '4': Game.buildMode = 'farm'; UI.updateBuildMenu(); break;
            case '5': Game.buildMode = 'mine'; UI.updateBuildMenu(); break;
            case '+': case '=': Game.gameSpeed = Math.min(3, Game.gameSpeed + 0.5); break;
            case '-': Game.gameSpeed = Math.max(0.5, Game.gameSpeed - 0.5); break;
            case 'p': Game.paused = !Game.paused; break;
        }
    },

    selectUnit(x, y) {
        Game.units.forEach(unit => unit.state = 'idle');

        const clicked = Game.units.find(u =>
            u.owner === 'player' && Utils.dist(u.x, u.y, x, y) < u.size
        );

        if (clicked) {
            clicked.state = 'selected';
            Game.selectedUnit = clicked;
        } else {
            Game.selectedUnit = null;
        }
    },

    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        Render.clear();
        Render.update(dt);
        Game.update(dt);

        Render.drawTerrain(Game.map);
        Game.buildings.forEach(b => Render.drawBuilding(b));
        Game.units.forEach(u => Render.drawUnit(u));
        Render.drawParticles();
        Render.drawMinimap(Game.map, Game.buildings, Game.units);

        UI.update();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
};

window.addEventListener('load', () => Main.init());
