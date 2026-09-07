/* Общие данные: ресурсы, здания, юниты, миссии */
"use strict";
const TILE = 32;

const RES = {
  wood:  { name: "Дерево", icon: "🪵" },
  plank: { name: "Доски",  icon: "🪚" },
  stone: { name: "Камень", icon: "🪨" },
  wheat: { name: "Пшеница",icon: "🌾" },
  bread: { name: "Хлеб",   icon: "🍞" },
  wine:  { name: "Вино",   icon: "🍷" },
  pig:   { name: "Свиньи", icon: "🐖" },
  meat:  { name: "Колбаса",icon: "🌭" },
  gold:  { name: "Золото", icon: "🪙" },
  iron:  { name: "Железо", icon: "⛓️" },
  arms:  { name: "Оружие", icon: "⚔️" },
  armor: { name: "Броня",  icon: "🛡️" },
};
const RES_KEYS = Object.keys(RES);

/* type: def здания. size в тайлах, cost, prod: {in,out,time,need} */
const BUILDINGS = {
  store:   { name:"Склад", icon:"🏰", size:2, cost:{wood:0,stone:0}, hp:1200, desc:"Хранилище. Потеря всех складов = поражение." },
  school:  { name:"Школа", icon:"🎓", size:2, cost:{plank:4,stone:3}, hp:600, desc:"Готовит сервов, строителей, рекрутов." },
  inn:     { name:"Таверна", icon:"🍺", size:2, cost:{plank:3,stone:3}, hp:600, desc:"Кормит мирных: хлеб, вино, колбаса." },
  woodhut: { name:"Лесоруб", icon:"🌲", size:1, cost:{plank:2}, hp:350, desc:"Рубит лес рядом. Даёт дерево.", prod:{ out:{wood:1}, time:7 } },
  saw:     { name:"Пилорама", icon:"🪚", size:2, cost:{plank:2,stone:2}, hp:450, desc:"Дерево → доски.", prod:{ in:{wood:2}, out:{plank:2}, time:10 } },
  quarry:  { name:"Каменоломня", icon:"⛏️", size:2, cost:{plank:3}, hp:450, desc:"Добывает камень рядом со скалами.", prod:{ out:{stone:1}, time:8 } },
  farm:    { name:"Ферма", icon:"🌾", size:2, cost:{plank:2,stone:1}, hp:400, desc:"Выращивает пшеницу.", prod:{ out:{wheat:2}, time:14 } },
  bakery:  { name:"Пекарня", icon:"🍞", size:2, cost:{plank:3,stone:2}, hp:450, desc:"Пшеница → хлеб.", prod:{ in:{wheat:2}, out:{bread:2}, time:12 } },
  vine:    { name:"Виноградник", icon:"🍇", size:2, cost:{plank:2,stone:1}, hp:400, desc:"Даёт вино.", prod:{ out:{wine:1}, time:16 } },
  swine:   { name:"Свиноферма", icon:"🐖", size:2, cost:{plank:3,stone:2}, hp:450, desc:"Пшеница → свиньи.", prod:{ in:{wheat:2}, out:{pig:1}, time:16 } },
  butcher: { name:"Мясник", icon:"🔪", size:2, cost:{plank:3,stone:2}, hp:450, desc:"Свиньи → колбаса.", prod:{ in:{pig:1}, out:{meat:2}, time:12 } },
  goldmine:{ name:"При­иск", icon:"🪙", size:2, cost:{plank:4,stone:3}, hp:500, desc:"Добывает золото (строй на жёлтых жилах).", prod:{ out:{gold:1}, time:14, needOre:"gold" } },
  ironmine:{ name:"Жел. шахта", icon:"⛓️", size:2, cost:{plank:4,stone:3}, hp:500, desc:"Добывает железо (строй на серых жилах).", prod:{ out:{iron:1}, time:12, needOre:"iron" } },
  weapon:  { name:"Оружейная", icon:"⚔️", size:2, cost:{plank:4,stone:3}, hp:500, desc:"Доски+железо → оружие.", prod:{ in:{plank:1,iron:1}, out:{arms:1}, time:14 } },
  armory:  { name:"Бронная", icon:"🛡️", size:2, cost:{plank:4,stone:3}, hp:500, desc:"Железо → броня.", prod:{ in:{iron:2}, out:{armor:1}, time:16 } },
  barracks:{ name:"Казармы", icon:"⚜️", size:2, cost:{plank:6,stone:6}, hp:900, desc:"Рекрут+оружие+броня → солдат." },
  tower:   { name:"Башня", icon:"🗼", size:1, cost:{stone:6,plank:2}, hp:800, desc:"Стреляет по врагам. Нужен гарнизон-лучник." },
};
const BUILD_ORDER = ["store","school","inn","woodhut","saw","quarry","farm","bakery","vine","swine","butcher","goldmine","ironmine","weapon","armory","barracks","tower"];

/* солдаты: цена найма в казарме */
const SOLDIERS = {
  militia: { name:"Ополченец", icon:"🧑‍🌾", hp:60,  atk:6,  range:1.2, speed:2.6, cost:{bread:1}, desc:"Слаб, но дёшев: только хлеб." },
  axe:     { name:"Копейщик",  icon:"🪓", hp:90,  atk:9,  range:1.4, speed:2.5, cost:{arms:1,bread:1}, desc:"Рекрут + оружие." },
  bow:     { name:"Лучник",    icon:"🏹", hp:70,  atk:8,  range:7,   speed:2.5, cost:{arms:1,bread:1}, ranged:true, desc:"Стреляет издалека." },
  sword:   { name:"Мечник",    icon:"🗡️", hp:150, atk:14, range:1.3, speed:2.7, cost:{arms:1,armor:1,bread:2}, desc:"Рекрут + оружие + броня." },
  knight:  { name:"Рыцарь",    icon:"🐎", hp:230, atk:20, range:1.4, speed:3.4, cost:{arms:1,armor:1,bread:3}, desc:"Элита. Бьёт конём." },
};

const MISSIONS = [
  { id:0, name:"Миссия 1 — Первый посад",
    brief:"Построй базу: школу, таверну, лесоруба, пилораму и казарму. Затем уничтожь бандитов на востоке.",
    startRes:{wood:14,plank:6,stone:10,bread:8,wine:2,gold:2},
    enemy:{ squads:2, interval:240, firstAt:200, towers:1 },
    win:{ destroyEnemy:true }, mapSeed: 7 },
  { id:1, name:"Миссия 2 — Железный кулак",
    brief:"Развитая база. Враг сильнее: рыцари и башни. Освой железо, построй армию и снеси вражескую крепость.",
    startRes:{wood:20,plank:12,stone:16,bread:12,wine:4,meat:4,gold:6,iron:4,arms:2,armor:2},
    enemy:{ squads:4, interval:170, firstAt:150, towers:3 },
    win:{ destroyEnemy:true }, mapSeed: 21,
    prebuilt:["store","school","inn","woodhut","saw","quarry","farm","bakery"] },
  { id:2, name:"Песочница — Вольный край",
    brief:"Свободная игра без жёстких условий: строй, корми, воюй. Враг атакует волнами.",
    startRes:{wood:30,plank:16,stone:20,bread:14,wine:6,meat:4,gold:8},
    enemy:{ squads:3, interval:200, firstAt:260, towers:2 },
    win:{ destroyEnemy:true, sandbox:true }, mapSeed: 42 },
];
