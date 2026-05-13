// Spiel-Konstanten - hier zentral, damit Tuning einfach bleibt

export const LANE_WIDTH = 2.2;
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH]; // links, mitte, rechts

export const PLAYER = {
  startY: 0.6,
  size: 0.9,
  jumpHeight: 2.2,
  jumpDuration: 0.65, // Sekunden
  duckDuration: 0.7,
  laneSwitchDuration: 0.18,
};

export const SPEED = {
  start: 18,
  max: 38,
  acceleration: 0.35, // Einheiten pro Sekunde, die pro Sekunde dazukommen
};

export const WORLD = {
  roadWidth: 8,
  segmentLength: 20,
  visibleSegments: 8, // wieviele Straßensegmente gleichzeitig
  despawnDistance: 15, // hinter dem Spieler löschen
};

export const COLORS = {
  sky: 0xf4d4a0,
  fog: 0xe8c890,
  road: 0x8a7560,
  roadStripe: 0x6b5944,
  grass: 0xa89060,
  marble: 0xf4ecd8,
  gold: 0xd4af37,
  terracotta: 0xc66b3d,
  cartBrown: 0x5a3820,
  banner: 0x7c1f1f,
  player: 0xc66b3d,
};
