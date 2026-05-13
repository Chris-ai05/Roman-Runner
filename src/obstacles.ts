import * as THREE from 'three';
import { COLORS, LANE_X, WORLD } from './constants';

export type ObstacleKind = 'low' | 'high' | 'full';

interface Obstacle {
  mesh: THREE.Object3D;
  kind: ObstacleKind;
  lane: number; // -1 = volle Bahn (alle 3)
  hitbox: THREE.Box3;
}

export class Obstacles {
  readonly group = new THREE.Group();

  private active: Obstacle[] = [];
  private nextSpawnZ: number; // Z (im world space, negativ in Laufrichtung), wo das nächste Hindernis erscheint
  private rng = Math.random;

  // Geometrien/Materialien wiederverwenden
  private pillarChunkGeo = new THREE.BoxGeometry(1.2, 0.7, 1);
  private pillarChunkMat = new THREE.MeshLambertMaterial({ color: COLORS.marble });

  private bannerPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 6);
  private bannerPoleMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
  private bannerClothGeo = new THREE.PlaneGeometry(1.6, 1.2);
  private bannerClothMat = new THREE.MeshLambertMaterial({
    color: COLORS.banner,
    side: THREE.DoubleSide,
  });

  private cartBodyMat = new THREE.MeshLambertMaterial({ color: COLORS.cartBrown });
  private wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12);
  private wheelMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });

  constructor(initialPlayerZ: number) {
    // erstes Hindernis erst ein Stück nach Spielstart
    this.nextSpawnZ = initialPlayerZ - 25;
  }

  update(dt: number, playerZ: number, speed: number): void {
    // Hindernisse bewegen sich NICHT relativ zur Welt - die Welt bewegt sich am Spieler vorbei.
    // Aber wir simulieren das hier so: Spieler-Z geht in -Z-Richtung kleiner,
    // Hindernisse haben feste Welt-Z, und werden entfernt sobald playerZ < obstacleZ - wegLänge.

    // Aufräumen: alles was hinter dem Spieler ist
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (o.mesh.position.z > playerZ + WORLD.despawnDistance) {
        this.group.remove(o.mesh);
        this.active.splice(i, 1);
      }
      // Hitbox wird nicht aktualisiert - Hindernisse bewegen sich nicht.
      // Sie wurde einmalig beim Spawn korrekt gesetzt.
    }

    // Neu spawnen: solange noch Platz vor dem Spieler ist (Sichtweite)
    const spawnHorizon = playerZ - 120;
    while (this.nextSpawnZ > spawnHorizon) {
      this.spawnNext(speed);
    }

    // ungenutzt - dt nur für mögliche Animationen wie rotierende Wagenräder
    void dt;
  }

  private spawnNext(speed: number) {
    const z = this.nextSpawnZ;
    const r = this.rng();
    let kind: ObstacleKind;
    if (r < 0.4) kind = 'low';
    else if (r < 0.7) kind = 'high';
    else kind = 'full';

    // alle drei Typen liegen jetzt auf genau einer Bahn
    const lane = Math.floor(this.rng() * 3);
    if (kind === 'low') this.spawnPillarChunk(z, lane);
    else if (kind === 'high') this.spawnBanner(z, lane);
    else this.spawnCart(z, lane);

    // Nächster Spawn-Abstand - bei höherer Geschwindigkeit etwas größer,
    // damit es spielbar bleibt
    const minGap = 12 + speed * 0.15;
    const gap = minGap + this.rng() * 10;
    this.nextSpawnZ -= gap;
  }

  private spawnPillarChunk(z: number, lane: number) {
    const mesh = new THREE.Mesh(this.pillarChunkGeo, this.pillarChunkMat);
    mesh.position.set(LANE_X[lane], 0.35, z);
    mesh.rotation.y = (this.rng() - 0.5) * 0.6;
    mesh.castShadow = true;
    this.group.add(mesh);

    // Hitbox manuell (Geometrie 1.2 x 0.7 x 1, Center y=0.35 -> y=0..0.7)
    const hb = new THREE.Box3(
      new THREE.Vector3(LANE_X[lane] - 0.6, 0, z - 0.5),
      new THREE.Vector3(LANE_X[lane] + 0.6, 0.7, z + 0.5)
    );

    this.active.push({
      mesh,
      kind: 'low',
      lane,
      hitbox: hb,
    });
  }

  private spawnBanner(z: number, lane: number) {
    const group = new THREE.Group();

    // zwei Pfosten links + rechts der Bahn
    for (const dx of [-0.9, 0.9]) {
      const pole = new THREE.Mesh(this.bannerPoleGeo, this.bannerPoleMat);
      pole.position.set(dx, 2, 0);
      group.add(pole);
    }

    // Banner (das eigentliche Hindernis - hängt oben)
    const cloth = new THREE.Mesh(this.bannerClothGeo, this.bannerClothMat);
    cloth.position.set(0, 2.6, 0);
    group.add(cloth);

    // Querbalken oben
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.15, 0.15),
      this.bannerPoleMat
    );
    beam.position.set(0, 3.4, 0);
    group.add(beam);

    group.position.set(LANE_X[lane], 0, z);

    // Hitbox manuell setzen: nur fürs Banner-Tuch oben.
    // Cloth ist 1.6 breit, 1.2 hoch, zentriert auf y=2.6 -> y=2.0..3.2
    // In Welt-Koords also lane-x, 2..3.2, z (Tiefe ist quasi 0)
    const hb = new THREE.Box3(
      new THREE.Vector3(LANE_X[lane] - 0.8, 2.0, z - 0.2),
      new THREE.Vector3(LANE_X[lane] + 0.8, 3.2, z + 0.2)
    );

    this.group.add(group);
    this.active.push({ mesh: group, kind: 'high', lane, hitbox: hb });
  }

  private spawnCart(z: number, lane: number) {
    const cart = new THREE.Group();

    // Wagenkasten - 1.8 breit, passt in eine 2.2 breite Bahn
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.2, 1.8);
    const body = new THREE.Mesh(bodyGeo, this.cartBodyMat);
    body.position.y = 1;
    body.castShadow = true;
    cart.add(body);

    // 4 Räder - eng am Wagen
    for (const dx of [-0.95, 0.95]) {
      for (const dz of [-0.6, 0.6]) {
        const wheel = new THREE.Mesh(this.wheelGeo, this.wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(dx, 0.5, dz);
        cart.add(wheel);
      }
    }

    // einfache Ladung
    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x8b6a3a })
    );
    cargo.position.y = 1.9;
    cart.add(cargo);

    cart.position.set(LANE_X[lane], 0, z);

    // Cart-Hitbox: eine Bahn breit, hoch genug dass Springen nicht hilft.
    // Der Spieler muss auf eine der anderen zwei Bahnen wechseln.
    const hb = new THREE.Box3(
      new THREE.Vector3(LANE_X[lane] - 1.0, 0, z - 1),
      new THREE.Vector3(LANE_X[lane] + 1.0, 3.5, z + 1)
    );

    this.group.add(cart);
    this.active.push({
      mesh: cart,
      kind: 'full',
      lane,
      hitbox: hb,
    });
  }

  /** Kollision mit dem Spieler prüfen. true = getroffen. */
  checkCollision(playerBox: THREE.Box3): Obstacle | null {
    for (const o of this.active) {
      if (o.hitbox.intersectsBox(playerBox)) return o;
    }
    return null;
  }

  clear() {
    for (const o of this.active) this.group.remove(o.mesh);
    this.active.length = 0;
  }

  reset(initialPlayerZ: number) {
    this.clear();
    this.nextSpawnZ = initialPlayerZ - 25;
  }
}
