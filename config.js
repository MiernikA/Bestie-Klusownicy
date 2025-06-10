export const hexConstants = {
    hexSize: 30,
    hexHeight: Math.sqrt(3) * 30,
    hexWidth: 2 * 30,
    vertDist: Math.sqrt(3) * 30,
    horizDist: (2 * 30) * 3 / 4
};

export const terrainColors = {
    grass: "#88cc44",
    water: "#3399ff",
    mountain: "#888888",
    sand: "#f4e285",
    swamp: "#9077b6",
    default: "#cccccc",
    ice: "#6da3c9",
    dirt: "#836b47",
    bridge: '#695846',
    toxic: "#86a6a0",
    waste: "#ebbf87",
    stone: "#6e7273",
    nether: "#ea8c7c"
};

const availableBehaviours = [
    "fellowship",
    "seek_furthest",
    "patrol_area",
    "pumpkin_lover",
    "traveller",
    "predator"
];

export const playerColors = ["🔵", "🔴", "🟢", "🟡"];

export const players = [
    { id: "p1", q: 3, r: 1, trail: [] },
    { id: "p2", q: 32, r: 1, trail: [] },
    { id: "p3", q: 32, r: 21, trail: [] },
    { id: "p4", q: 3, r: 21, trail: [] }
];

export const obstacles = [
    { id: "o1", q: 0, r: 10 },
    { id: "o2", q: 0, r: 11 },
    { id: "o4", q: 13, r: 0 },
    { id: "o5", q: 16, r: 0 },
    { id: "o6", q: 16, r: 1 },
    { id: "o7", q: 15, r: 1 },
    { id: "o8", q: 15, r: 0 },
    { id: "o9", q: 17, r: 0 },
    { id: "o11", q: 8, r: 2 },
    { id: "o12", q: 17, r: 3 }, //pumpkin
    { id: "o13", q: 26, r: 3 },
    { id: "o14", q: 26, r: 4 },
    { id: "o15", q: 25, r: 3 },
    { id: "o16", q: 25, r: 4 },
    { id: "o17", q: 24, r: 4 },
    { id: "o18", q: 24, r: 5 },
    { id: "o19", q: 0, r: 7 },
    { id: "o20", q: 6, r: 5 },
    { id: "o21", q: 6, r: 6 },
    { id: "o22", q: 5, r: 6 },
    { id: "o23", q: 5, r: 5 },
    { id: "o24", q: 13, r: 3 },
    { id: "o25", q: 13, r: 4 },
    { id: "o26", q: 14, r: 4 },
    { id: "o27", q: 12, r: 4 },
    { id: "o28", q: 12, r: 5 },
    { id: "o29", q: 11, r: 4 },
    { id: "o30", q: 7, r: 6 },
    { id: "o31", q: 8, r: 7 },
    { id: "o32", q: 6, r: 7 },
    { id: "o33", q: 6, r: 8 },
    { id: "o34", q: 5, r: 8 },
    { id: "o36", q: 4, r: 8 },
    { id: "o37", q: 1, r: 10 },
    { id: "o38", q: 8, r: 11 }, //pumpkin
    { id: "o39", q: 7, r: 7 },
    { id: "o40", q: 5, r: 13 },
    { id: "o41", q: 4, r: 14 },
    { id: "o43", q: 4, r: 19 },
    { id: "o44", q: 5, r: 19 },
    { id: "o45", q: 5, r: 18 },
    { id: "o46", q: 6, r: 18 },
    { id: "o47", q: 15, r: 20 },
    { id: "o48", q: 16, r: 21 },
    { id: "o49", q: 17, r: 20 },
    { id: "o50", q: 14, r: 8 },
    { id: "o51", q: 14, r: 9 },
    { id: "o52", q: 14, r: 10 },
    { id: "o53", q: 13, r: 10 },
    { id: "o54", q: 12, r: 11 },
    { id: "o55", q: 11, r: 11 },
    { id: "o56", q: 10, r: 12 },
    { id: "o57", q: 10, r: 13 },
    { id: "o58", q: 10, r: 14 },
    { id: "o59", q: 14, r: 17 },
    { id: "o60", q: 15, r: 17 },
    { id: "o61", q: 16, r: 18 },
    { id: "o62", q: 19, r: 17 },
    { id: "o63", q: 20, r: 17 },
    { id: "o64", q: 21, r: 16 },
    { id: "o65", q: 23, r: 11 },
    { id: "o66", q: 23, r: 12 },
    { id: "o67", q: 23, r: 13 },
    { id: "o68", q: 19, r: 7 },
    { id: "o69", q: 19, r: 8 },
    { id: "o70", q: 20, r: 8 },
    { id: "o71", q: 21, r: 20 },
    { id: "o72", q: 20, r: 21 },
    { id: "o73", q: 20, r: 22 },
    { id: "o74", q: 19, r: 22 },
    { id: "o75", q: 20, r: 23 },
    { id: "o76", q: 24, r: 20 },
    { id: "o77", q: 25, r: 19 },
    { id: "o78", q: 25, r: 20 },
    { id: "o79", q: 27, r: 21 }, //pumpkin
    { id: "o81", q: 30, r: 17 },
    { id: "o82", q: 31, r: 17 },
    { id: "o83", q: 30, r: 18 },
    { id: "o84", q: 33, r: 15 },
    { id: "o85", q: 34, r: 15 },
    { id: "o86", q: 35, r: 14 },
    { id: "o87", q: 35, r: 15 },
    { id: "o88", q: 19, r: 7 },
    { id: "o89", q: 19, r: 8 },
    { id: "o90", q: 20, r: 8 },
    { id: "o91", q: 31, r: 5 },
    { id: "o92", q: 31, r: 6 },
    { id: "o93", q: 30, r: 7 },
    { id: "o94", q: 30, r: 6 },
    { id: "o96", q: 29, r: 10 },
    { id: "o97", q: 30, r: 11 },
    { id: "o98", q: 31, r: 11 },
    { id: "o99", q: 30, r: 12 },
    { id: "o100", q: 31, r: 12 },
    { id: "o101", q: 29, r: 11 },
    { id: "o102", q: 16, r: 12 },
    { id: "o103", q: 17, r: 12 },
    { id: "o104", q: 17, r: 13 },
    { id: "o105", q: 16, r: 13 },
    { id: "o106", q: 16, r: 14 },
    { id: "o107", q: 15, r: 12 },
    { id: "o108", q: 15, r: 13 },
    { id: "o107", q: 3, r: 8 },
    { id: "o108", q: 4, r: 9 },
    { id: "o108", q: 5, r: 7 },
];

export const monsters = [
    {
        id: "1",
        q: 15,
        r: 15,
        speed: 2,
        trail: [],
        behaviors: ["seek_furthest"],
        color: "red",
    },
    {
        id: "2",
        q: 13,
        r: 13,
        speed: 3,
        trail: [],
        behaviors: ["pumpkin_lover"],
        color: "blue"
    },
    {
        id: "3",
        q: 17,
        r: 10,
        speed: 2,
        behaviors: ["traveller"],
        trail: [],
        color: "pink"
    },
    {
        id: "4",
        q: 20,
        r: 12,
        speed: 3,
        trail: [],
        behaviors: ["fellowship"],
        color: "yellow",
    },
    {
        id: "5",
        q: 19,
        r: 14,
        speed: 3,
        trail: [],
        behaviors: ["predator"],
        color: "cyan"
    },
    {
        id: "6",
        q: 13,
        r: 11,
        speed: 4,
        trail: [],
        behaviors: ["patrol_area"],
        color: "navy"
    }
];

function assignRandomBehaviours(monsters, behaviours) {
  let availableBehaviours = [...behaviours];

  monsters.forEach(monster => {
    const randomIndex = Math.floor(Math.random() * availableBehaviours.length);
    const assignedBehaviour = availableBehaviours.splice(randomIndex, 1)[0];
    monster.behaviors = [assignedBehaviour];
  });
}

assignRandomBehaviours(monsters, availableBehaviours);

