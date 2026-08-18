// Medieval Strategy Game - King vs Upstart Knight
// 10 missions where player controls King's army to defeat the rebel knight

let scene, camera, renderer, raycaster, mouse;
let units = [];
let enemies = [];
let buildings = [];
let terrain = [];
let selectedUnits = [];
let currentMission = 1;
let gameStarted = false;
let resources = { food: 200, wood: 200, gold: 200 };
let cameraAngle = Math.PI / 4;
let cameraDistance = 50;
let cameraHeight = 30;
let isDragging = false;
let lastMousePosition = { x: 0, y: 0 };
let selectionBox = null;
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };

// Unit types with stats
const unitTypes = {
    peasant: { 
        name: 'Крестьянин', 
        cost: { food: 50 }, 
        hp: 30, 
        damage: 5, 
        range: 1, 
        speed: 0.05,
        icon: '👨‍🌾',
        color: 0x8B4513
    },
    swordsman: { 
        name: 'Мечник', 
        cost: { food: 60, gold: 20 }, 
        hp: 80, 
        damage: 15, 
        range: 1, 
        speed: 0.08,
        icon: '⚔️',
        color: 0x4169E1
    },
    archer: { 
        name: 'Лучник', 
        cost: { food: 50, wood: 30 }, 
        hp: 50, 
        damage: 12, 
        range: 8, 
        speed: 0.07,
        icon: '🏹',
        color: 0x228B22
    },
    knight: { 
        name: 'Рыцарь', 
        cost: { food: 80, gold: 50 }, 
        hp: 150, 
        damage: 25, 
        range: 1, 
        speed: 0.12,
        icon: '🐴',
        color: 0xFFD700
    },
    catapult: { 
        name: 'Катапульта', 
        cost: { wood: 100, gold: 75 }, 
        hp: 100, 
        damage: 50, 
        range: 10, 
        speed: 0.03,
        icon: '🏰',
        color: 0x8B0000
    }
};

// 10 Missions with increasing difficulty
const missions = [
    {
        title: "Миссия 1: Первые шаги",
        description: "Небольшой отряд выскочки появился near нашей деревни. Уничтожьте их!",
        startingResources: { food: 300, wood: 200, gold: 200 },
        startingUnits: ['swordsman', 'swordsman', 'archer'],
        enemyUnits: ['peasant', 'peasant', 'swordsman'],
        mapSize: 100,
        enemyBasePosition: { x: 60, z: 60 }
    },
    {
        title: "Миссия 2: Разведка боем",
        description: "Выскочка укрепляет свои позиции. Разбейте его аванпост!",
        startingResources: { food: 400, wood: 300, gold: 300 },
        startingUnits: ['swordsman', 'swordsman', 'archer', 'archer'],
        enemyUnits: ['swordsman', 'swordsman', 'archer', 'peasant'],
        mapSize: 120,
        enemyBasePosition: { x: 80, z: 80 }
    },
    {
        title: "Миссия 3: Лесная засада",
        description: "Враг прячется в лесах. Найдите и уничтожьте!",
        startingResources: { food: 500, wood: 400, gold: 400 },
        startingUnits: ['swordsman', 'swordsman', 'archer', 'archer', 'peasant'],
        enemyUnits: ['swordsman', 'archer', 'archer', 'knight'],
        mapSize: 140,
        enemyBasePosition: { x: 90, z: 90 }
    },
    {
        title: "Миссия 4: Рыцарский вызов",
        description: "Сам выскочка появился на поле боя в сопровождении рыцарей!",
        startingResources: { food: 600, wood: 500, gold: 500 },
        startingUnits: ['swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'knight'],
        enemyUnits: ['knight', 'knight', 'swordsman', 'swordsman', 'archer'],
        mapSize: 150,
        enemyBasePosition: { x: 100, z: 100 }
    },
    {
        title: "Миссия 5: Осада",
        description: "Враг построил укрепления. Используйте катапульты!",
        startingResources: { food: 700, wood: 600, gold: 600 },
        startingUnits: ['swordsman', 'swordsman', 'archer', 'archer', 'catapult'],
        enemyUnits: ['swordsman', 'swordsman', 'archer', 'knight', 'knight'],
        mapSize: 160,
        enemyBasePosition: { x: 110, z: 110 }
    },
    {
        title: "Миссия 6: Двойной удар",
        description: "Выскочка разделил армию. Уничтожьте обе группы!",
        startingResources: { food: 800, wood: 700, gold: 700 },
        startingUnits: ['swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'knight', 'catapult'],
        enemyUnits: ['knight', 'knight', 'knight', 'swordsman', 'swordsman', 'archer', 'archer'],
        mapSize: 180,
        enemyBasePosition: { x: 120, z: 120 }
    },
    {
        title: "Миссия 7: Горный перевал",
        description: "Враг занял выгодную позицию в горах.",
        startingResources: { food: 900, wood: 800, gold: 800 },
        startingUnits: ['swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'archer', 'knight', 'catapult'],
        enemyUnits: ['knight', 'knight', 'knight', 'knight', 'swordsman', 'swordsman', 'archer', 'archer'],
        mapSize: 200,
        enemyBasePosition: { x: 140, z: 140 }
    },
    {
        title: "Миссия 8: Решающая битва",
        description: "Основная армия выскочки готова к бою!",
        startingResources: { food: 1000, wood: 900, gold: 900 },
        startingUnits: ['swordsman', 'swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'archer', 'knight', 'knight', 'catapult'],
        enemyUnits: ['knight', 'knight', 'knight', 'knight', 'knight', 'swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'catapult'],
        mapSize: 220,
        enemyBasePosition: { x: 160, z: 160 }
    },
    {
        title: "Миссия 9: Штурм замка",
        description: "Выскочка забаррикадировался в старом замке. Возьмите его штурмом!",
        startingResources: { food: 1200, wood: 1000, gold: 1000 },
        startingUnits: ['swordsman', 'swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'archer', 'archer', 'knight', 'knight', 'knight', 'catapult', 'catapult'],
        enemyUnits: ['knight', 'knight', 'knight', 'knight', 'knight', 'knight', 'swordsman', 'swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'archer', 'catapult'],
        mapSize: 240,
        enemyBasePosition: { x: 180, z: 180 }
    },
    {
        title: "Миссия 10: Финальная схватка",
        description: "Последний бой! Уничтожьте выскочку и восстановите мир в королевстве!",
        startingResources: { food: 1500, wood: 1200, gold: 1200 },
        startingUnits: ['swordsman', 'swordsman', 'swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'archer', 'archer', 'archer', 'knight', 'knight', 'knight', 'knight', 'catapult', 'catapult'],
        enemyUnits: ['knight', 'knight', 'knight', 'knight', 'knight', 'knight', 'knight', 'swordsman', 'swordsman', 'swordsman', 'swordsman', 'swordsman', 'archer', 'archer', 'archer', 'archer', 'catapult', 'catapult', 'boss'],
        mapSize: 260,
        enemyBasePosition: { x: 200, z: 200 }
    }
];

// Initialize Three.js scene
function init() {
    const container = document.getElementById('canvas-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 300);
    
    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('mouseup', onMouseUp, false);
    renderer.domElement.addEventListener('contextmenu', onRightClick, false);
    
    // UI event listeners
    document.querySelectorAll('.unit-card').forEach(card => {
        card.addEventListener('click', () => selectUnitType(card));
    });
    
    // Show initial message
    document.getElementById('message-area').style.display = 'block';
    
    // Start animation loop
    animate();
}

function updateCameraPosition() {
    camera.position.x = cameraDistance * Math.sin(cameraAngle);
    camera.position.z = cameraDistance * Math.cos(cameraAngle);
    camera.position.y = cameraHeight;
    camera.lookAt(scene.position);
}

function createTerrain(size) {
    // Remove old terrain
    terrain.forEach(t => scene.remove(t));
    terrain = [];
    
    // Create grass ground
    const geometry = new THREE.PlaneGeometry(size, size, 50, 50);
    
    // Add some height variation
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        vertices[i + 2] = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2;
    }
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    terrain.push(ground);
    
    // Add some trees
    for (let i = 0; i < size / 5; i++) {
        const x = (Math.random() - 0.5) * size * 0.8;
        const z = (Math.random() - 0.5) * size * 0.8;
        
        // Don't place trees near starting positions
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
        if (Math.abs(x - size/3) < 20 && Math.abs(z - size/3) < 20) continue;
        
        createTree(x, z);
    }
}

function createTree(x, z) {
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene.add(trunk);
    terrain.push(trunk);
    
    const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x006400 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, 4, z);
    leaves.castShadow = true;
    scene.add(leaves);
    terrain.push(leaves);
}

function createUnit(type, x, z, isEnemy = false) {
    const unitData = unitTypes[type];
    if (!unitData) return null;
    
    // Create unit group
    const unitGroup = new THREE.Group();
    
    // Base cylinder
    const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: isEnemy ? 0xFF0000 : 0x0000FF });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    unitGroup.add(base);
    
    // Unit body (different shapes for different types)
    let bodyGeometry;
    switch(type) {
        case 'peasant':
            bodyGeometry = new THREE.BoxGeometry(1.5, 2, 1.5);
            break;
        case 'swordsman':
            bodyGeometry = new THREE.CylinderGeometry(1, 1.2, 2.5, 8);
            break;
        case 'archer':
            bodyGeometry = new THREE.CylinderGeometry(0.8, 1, 2.2, 8);
            break;
        case 'knight':
            bodyGeometry = new THREE.BoxGeometry(2, 2.5, 3);
            break;
        case 'catapult':
            bodyGeometry = new THREE.BoxGeometry(3, 2, 3);
            break;
        case 'boss':
            bodyGeometry = new THREE.CylinderGeometry(2, 2.5, 4, 8);
            break;
        default:
            bodyGeometry = new THREE.BoxGeometry(1.5, 2, 1.5);
    }
    
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: unitData.color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = type === 'catapult' ? 1 : (type === 'knight' ? 1.75 : (type === 'boss' ? 2.5 : 1.5));
    body.castShadow = true;
    unitGroup.add(body);
    
    // Health bar
    const healthBarBg = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    healthBarBg.position.y = type === 'catapult' ? 2.5 : (type === 'knight' ? 3.5 : (type === 'boss' ? 5 : 3));
    healthBarBg.rotation.x = -Math.PI / 4;
    unitGroup.add(healthBarBg);
    
    const healthBar = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 0.25),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    healthBar.position.y = type === 'catapult' ? 2.5 : (type === 'knight' ? 3.5 : (type === 'boss' ? 5 : 3));
    healthBar.position.x = -0.1;
    healthBar.rotation.x = -Math.PI / 4;
    healthBar.name = 'healthBar';
    unitGroup.add(healthBar);
    
    unitGroup.position.set(x, 0, z);
    scene.add(unitGroup);
    
    const unit = {
        mesh: unitGroup,
        type: type,
        hp: unitData.hp,
        maxHp: unitData.hp,
        damage: unitData.damage,
        range: unitData.range,
        speed: unitData.speed,
        isEnemy: isEnemy,
        target: null,
        state: 'idle',
        attackCooldown: 0,
        icon: unitData.icon
    };
    
    if (isEnemy) {
        enemies.push(unit);
    } else {
        units.push(unit);
    }
    
    updateUI();
    return unit;
}

function selectUnitType(card) {
    document.querySelectorAll('.unit-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
}

function spawnUnit(type) {
    const unitData = unitTypes[type];
    if (!unitData) return false;
    
    // Check resources
    for (let resource in unitData.cost) {
        if (resources[resource] < unitData.cost[resource]) {
            showMessage('Недостаточно ресурсов!', 'warning');
            return false;
        }
    }
    
    // Deduct resources
    for (let resource in unitData.cost) {
        resources[resource] -= unitData.cost[resource];
    }
    
    // Find spawn position near base
    const spawnX = (Math.random() - 0.5) * 20;
    const spawnZ = (Math.random() - 0.5) * 20 - 10;
    
    createUnit(type, spawnX, spawnZ, false);
    updateUI();
    return true;
}

function onMouseDown(event) {
    if (!gameStarted) return;
    
    if (event.button === 0) { // Left click
        isSelecting = true;
        selectionStart = { x: event.clientX, y: event.clientY };
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Check if clicking on unit
        const unitMeshes = units.map(u => u.mesh.children[0]).concat(enemies.map(e => e.mesh.children[0]));
        const intersects = raycaster.intersectObjects(unitMeshes);
        
        if (intersects.length > 0) {
            // Find which unit was clicked
            for (let unit of units) {
                if (unit.mesh.children[0] === intersects[0].object || 
                    unit.mesh === intersects[0].object.parent) {
                    if (!event.shiftKey) {
                        selectedUnits = [];
                    }
                    if (!selectedUnits.includes(unit)) {
                        selectedUnits.push(unit);
                    }
                    break;
                }
            }
        } else if (!event.shiftKey) {
            selectedUnits = [];
        }
    } else if (event.button === 2) { // Right click (camera rotation)
        isDragging = true;
        lastMousePosition = { x: event.clientX, y: event.clientY };
    }
}

function onMouseMove(event) {
    if (isDragging) {
        const deltaX = event.clientX - lastMousePosition.x;
        const deltaY = event.clientY - lastMousePosition.y;
        
        cameraAngle -= deltaX * 0.01;
        cameraHeight = Math.max(10, Math.min(60, cameraHeight - deltaY * 0.1));
        
        updateCameraPosition();
        lastMousePosition = { x: event.clientX, y: event.clientY };
    }
    
    if (isSelecting) {
        // Update selection box visual (could be implemented)
    }
}

function onMouseUp(event) {
    if (event.button === 0 && isSelecting) {
        isSelecting = false;
        
        // Box selection
        const rect = {
            left: Math.min(selectionStart.x, event.clientX),
            right: Math.max(selectionStart.x, event.clientX),
            top: Math.min(selectionStart.y, event.clientY),
            bottom: Math.max(selectionStart.y, event.clientY)
        };
        
        // If it's a small click (not a drag), already handled in onMouseDown
        if (rect.right - rect.left < 10 && rect.bottom - rect.top < 10) {
            return;
        }
        
        // Select units in rectangle
        if (!event.shiftKey) {
            selectedUnits = [];
        }
        
        units.forEach(unit => {
            const screenPos = unit.mesh.position.clone().project(camera);
            const screenX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            
            if (screenX >= rect.left && screenX <= rect.right &&
                screenY >= rect.top && screenY <= rect.bottom) {
                if (!selectedUnits.includes(unit)) {
                    selectedUnits.push(unit);
                }
            }
        });
    }
    
    isDragging = false;
}

function onRightClick(event) {
    event.preventDefault();
    if (!gameStarted) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check if clicking on ground
    const groundIntersects = raycaster.intersectObjects(terrain.filter(t => t.geometry.type === 'PlaneGeometry'));
    
    if (groundIntersects.length > 0 && selectedUnits.length > 0) {
        const targetPoint = groundIntersects[0].point;
        
        // Move selected units to target
        selectedUnits.forEach(unit => {
            unit.target = { x: targetPoint.x, z: targetPoint.z };
            unit.state = 'moving';
        });
    }
    
    // Check if clicking on enemy
    const enemyIntersects = raycaster.intersectObjects(enemies.map(e => e.mesh));
    if (enemyIntersects.length > 0 && selectedUnits.length > 0) {
        const targetEnemy = enemyIntersects[0].object.parent;
        const enemy = enemies.find(e => e.mesh === targetEnemy);
        
        if (enemy) {
            selectedUnits.forEach(unit => {
                unit.target = enemy;
                unit.state = 'attacking';
            });
        }
    }
}

function updateUnits() {
    // Update player units
    units.forEach((unit, index) => {
        if (unit.state === 'moving' && unit.target) {
            const dx = unit.target.x - unit.mesh.position.x;
            const dz = unit.target.z - unit.mesh.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance > 1) {
                unit.mesh.position.x += (dx / distance) * unit.speed;
                unit.mesh.position.z += (dz / distance) * unit.speed;
                unit.mesh.rotation.y = Math.atan2(dx, dz);
            } else {
                unit.state = 'idle';
                unit.target = null;
            }
        } else if (unit.state === 'attacking' && unit.target) {
            const targetEnemy = unit.target;
            if (!targetEnemy || targetEnemy.hp <= 0) {
                unit.state = 'idle';
                unit.target = null;
                return;
            }
            
            const dx = targetEnemy.mesh.position.x - unit.mesh.position.x;
            const dz = targetEnemy.mesh.position.z - unit.mesh.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance > unit.range) {
                // Move towards target
                unit.mesh.position.x += (dx / distance) * unit.speed;
                unit.mesh.position.z += (dz / distance) * unit.speed;
                unit.mesh.rotation.y = Math.atan2(dx, dz);
            } else {
                // Attack
                if (unit.attackCooldown <= 0) {
                    attack(unit, targetEnemy);
                    unit.attackCooldown = 60; // 1 second at 60fps
                }
            }
        } else if (unit.state === 'idle') {
            // Auto-attack nearby enemies
            enemies.forEach(enemy => {
                if (enemy.hp > 0) {
                    const dx = enemy.mesh.position.x - unit.mesh.position.x;
                    const dz = enemy.mesh.position.z - unit.mesh.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    if (distance <= unit.range) {
                        unit.target = enemy;
                        unit.state = 'attacking';
                    }
                }
            });
        }
        
        // Cooldown
        if (unit.attackCooldown > 0) {
            unit.attackCooldown--;
        }
    });
    
    // Update enemy units (simple AI)
    enemies.forEach((unit, index) => {
        if (unit.hp <= 0) return;
        
        if (unit.state === 'idle' || unit.state === 'attacking') {
            // Find nearest player unit
            let nearestUnit = null;
            let nearestDistance = Infinity;
            
            units.forEach(playerUnit => {
                if (playerUnit.hp > 0) {
                    const dx = playerUnit.mesh.position.x - unit.mesh.position.x;
                    const dz = playerUnit.mesh.position.z - unit.mesh.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestUnit = playerUnit;
                    }
                }
            });
            
            if (nearestUnit && nearestDistance < 30) {
                if (nearestDistance > unit.range) {
                    // Move towards player
                    const dx = nearestUnit.mesh.position.x - unit.mesh.position.x;
                    const dz = nearestUnit.mesh.position.z - unit.mesh.position.z;
                    unit.mesh.position.x += (dx / nearestDistance) * unit.speed * 0.5;
                    unit.mesh.position.z += (dz / nearestDistance) * unit.speed * 0.5;
                    unit.mesh.rotation.y = Math.atan2(dx, dz);
                    unit.state = 'attacking';
                    unit.target = nearestUnit;
                } else {
                    // Attack
                    if (unit.attackCooldown <= 0) {
                        attack(unit, nearestUnit);
                        unit.attackCooldown = 60;
                    }
                }
            }
        }
        
        if (unit.attackCooldown > 0) {
            unit.attackCooldown--;
        }
    });
    
    // Remove dead units
    units = units.filter(u => u.hp > 0);
    enemies = enemies.filter(e => e.hp > 0);
    
    // Update health bars
    [...units, ...enemies].forEach(unit => {
        const healthBar = unit.mesh.getObjectByName('healthBar');
        if (healthBar) {
            const healthPercent = unit.hp / unit.maxHp;
            healthBar.scale.x = healthPercent;
            healthBar.material.color.setHex(healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.25 ? 0xffff00 : 0xff0000));
        }
    });
    
    updateUI();
    checkMissionStatus();
}

function attack(attacker, defender) {
    defender.hp -= attacker.damage;
    
    // Visual feedback
    const flash = new THREE.PointLight(0xff0000, 1, 5);
    flash.position.copy(defender.mesh.position);
    flash.position.y = 2;
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 100);
    
    if (defender.hp <= 0) {
        // Death effect
        setTimeout(() => {
            scene.remove(defender.mesh);
            const index = units.indexOf(defender);
            if (index > -1) units.splice(index, 1);
            else {
                const enemyIndex = enemies.indexOf(defender);
                if (enemyIndex > -1) enemies.splice(enemyIndex, 1);
            }
        }, 500);
    }
}

function checkMissionStatus() {
    if (enemies.length === 0) {
        // Victory
        if (currentMission < missions.length) {
            showMessage('Победа!', `Миссия ${currentMission} выполнена! Переход к следующей миссии...`, 'success');
            setTimeout(() => {
                currentMission++;
                loadMission(currentMission);
            }, 3000);
        } else {
            showMessage('ПОБЕДА!', 'Вы победили выскочку и восстановили мир в королевстве! Король награждает вас званием Верховного Генерала!', 'success');
            gameStarted = false;
        }
    } else if (units.length === 0) {
        // Defeat
        showMessage('Поражение', 'Все ваши войска уничтожены. Попробуйте снова!', 'error');
        setTimeout(() => {
            loadMission(currentMission);
        }, 3000);
    }
}

function loadMission(missionNum) {
    const mission = missions[missionNum - 1];
    
    // Clear scene
    units.forEach(u => scene.remove(u.mesh));
    enemies.forEach(e => scene.remove(e.mesh));
    units = [];
    enemies = [];
    selectedUnits = [];
    
    // Reset resources
    resources = { ...mission.startingResources };
    
    // Create terrain
    createTerrain(mission.mapSize);
    
    // Spawn starting units
    mission.startingUnits.forEach((unitType, index) => {
        const angle = (index / mission.startingUnits.length) * Math.PI * 2;
        const x = Math.sin(angle) * 10;
        const z = Math.cos(angle) * 10 - 10;
        createUnit(unitType, x, z, false);
    });
    
    // Spawn enemy units
    mission.enemyUnits.forEach((unitType, index) => {
        const angle = (index / mission.enemyUnits.length) * Math.PI * 2;
        const x = mission.enemyBasePosition.x + Math.sin(angle) * 15;
        const z = mission.enemyBasePosition.z + Math.cos(angle) * 15;
        createUnit(unitType, x, z, true);
    });
    
    // Update UI
    document.getElementById('mission-info').textContent = mission.title;
    updateUI();
    
    // Hide message area
    document.getElementById('message-area').style.display = 'none';
    
    gameStarted = true;
}

function startGame() {
    loadMission(1);
}

function showMessage(title, text, type = 'info') {
    const messageArea = document.getElementById('message-area');
    const messageTitle = document.getElementById('message-title');
    const messageText = document.getElementById('message-text');
    
    messageTitle.textContent = title;
    messageText.textContent = text;
    
    messageArea.style.borderColor = type === 'success' ? '#00ff00' : (type === 'error' ? '#ff0000' : '#ffd700');
    messageArea.style.display = 'block';
}

function updateUI() {
    document.getElementById('food').textContent = Math.floor(resources.food);
    document.getElementById('wood').textContent = Math.floor(resources.wood);
    document.getElementById('gold').textContent = Math.floor(resources.gold);
    document.getElementById('army').textContent = units.length;
    
    // Update minimap
    updateMinimap();
}

function updateMinimap() {
    const minimap = document.getElementById('minimap');
    const ctx = minimap.getContext('2d');
    const width = minimap.width = minimap.offsetWidth;
    const height = minimap.height = minimap.offsetHeight;
    
    const mission = missions[currentMission - 1];
    if (!mission) return;
    
    const scale = Math.min(width, height) / mission.mapSize;
    
    // Clear
    ctx.fillStyle = '#1a472a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw player units (blue)
    ctx.fillStyle = '#0000ff';
    units.forEach(unit => {
        const x = (unit.mesh.position.x + mission.mapSize/2) * scale;
        const y = (unit.mesh.position.z + mission.mapSize/2) * scale;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw enemy units (red)
    ctx.fillStyle = '#ff0000';
    enemies.forEach(unit => {
        const x = (unit.mesh.position.x + mission.mapSize/2) * scale;
        const y = (unit.mesh.position.z + mission.mapSize/2) * scale;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw base markers
    ctx.fillStyle = '#0000ff';
    ctx.fillRect((mission.mapSize/2 - 10) * scale, (mission.mapSize/2 - 10) * scale, 20 * scale, 20 * scale);
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect((mission.enemyBasePosition.x) * scale, (mission.enemyBasePosition.z) * scale, 20 * scale, 20 * scale);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameStarted) {
        updateUnits();
    }
    
    renderer.render(scene, camera);
}

// Initialize game when page loads
window.addEventListener('load', init);
