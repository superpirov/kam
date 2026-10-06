const UI = {
    buildButtons: [
        { type: 'house', icon: '🏠', label: 'Дом', cost: '50🪵 20🪨' },
        { type: 'barracks', icon: '⚔️', label: 'Казарма', cost: '100🪵 50🪨' },
        { type: 'tower', icon: '🗼', label: 'Башня', cost: '30🪵 80🪨' },
        { type: 'farm', icon: '🌾', label: 'Ферма', cost: '40🪵 10🪨' },
        { type: 'mine', icon: '⛏️', label: 'Шахта', cost: '60🪵 30🪨' }
    ],

    unitButtons: [
        { type: 'worker', icon: '👷', label: 'Рабочий', cost: '20🍖 10🪙' },
        { type: 'soldier', icon: '🗡️', label: 'Солдат', cost: '30🍖 20🪙' },
        { type: 'archer', icon: '🏹', label: 'Лучник', cost: '25🍖 15🪙' },
        { type: 'knight', icon: '🐴', label: 'Рыцарь', cost: '50🍖 40🪙' }
    ],

    init() {
        this.createBuildMenu();
        this.createUnitMenu();
        this.updateResources();
    },

    createBuildMenu() {
        const menu = document.getElementById('build-menu');
        menu.innerHTML = '';

        this.buildButtons.forEach(btn => {
            const el = document.createElement('div');
            el.className = 'build-btn';
            el.innerHTML = `<span class="icon">${btn.icon}</span><span class="label">${btn.label}</span><span class="cost">${btn.cost}</span>`;
            el.onclick = () => {
                Audio.playClick();
                Game.buildMode = Game.buildMode === btn.type ? null : btn.type;
                this.updateBuildMenu();
            };
            menu.appendChild(el);
        });
    },

    createUnitMenu() {
        const menu = document.getElementById('selection-info');
        menu.innerHTML = '<div style="color:#888;font-size:11px;margin-bottom:4px;">Обучение юнитов:</div>';

        this.unitButtons.forEach(btn => {
            const el = document.createElement('div');
            el.className = 'build-btn';
            el.style.cssText = 'display:inline-flex;width:48px;height:48px;margin:2px;';
            el.innerHTML = `<span class="icon">${btn.icon}</span>`;
            el.title = `${btn.label} (${btn.cost})`;
            el.onclick = () => {
                if (Game.trainUnit(btn.type)) {
                    this.updateResources();
                }
            };
            menu.appendChild(el);
        });
    },

    updateBuildMenu() {
        document.querySelectorAll('#build-menu .build-btn').forEach((el, i) => {
            el.classList.toggle('active', Game.buildMode === this.buildButtons[i].type);
        });
    },

    updateResources() {
        document.querySelector('#res-gold .value').textContent = Math.floor(Game.resources.gold);
        document.querySelector('#res-wood .value').textContent = Math.floor(Game.resources.wood);
        document.querySelector('#res-stone .value').textContent = Math.floor(Game.resources.stone);
        document.querySelector('#res-food .value').textContent = Math.floor(Game.resources.food);
        document.querySelector('#res-pop .value').textContent = `${Game.population}/${Game.maxPopulation}`;
    },

    showMessage(text) {
        const msg = document.getElementById('game-message');
        msg.textContent = text;
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 3000);
    },

    update() {
        this.updateResources();
    }
};
