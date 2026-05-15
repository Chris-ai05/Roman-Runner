import * as THREE from 'three';
import { LANE_X, WORLD } from './constants';

/**
 * Power-Up-System.
 *
 * Aktuell: Pferd als Mount. Der Spieler berührt es, steigt auf und ist für
 * 10 Sekunden unsterblich + schneller. Erneutes Aufsammeln während des
 * Reitens verlängert den Timer.
 *
 * Spawning ist distanzbasiert: im Schnitt alle 3000 Distanz-Einheiten
 * (≈ Punkte) ein Pferd, mit Streuung ±1500. Während der Spieler reitet,
 * werden keine neuen Pferde gespawnt - das wird vom Game gesteuert,
 * das `pauseSpawning(true/false)` setzt.
 */

export interface PowerUp {
  kind: 'horse';
  mesh: THREE.Object3D;
  lane: number;
  hitbox: THREE.Box3;
  /** Z-Position, an der dieses Power-Up steht. */
  z: number;
}

export class PowerUps {
  readonly group = new THREE.Group();

  private active: PowerUp[] = [];
  /** Distanzwert, bei dem das nächste Pferd spawnt. */
  private nextSpawnDistance = 0;
  /** Falls true, werden keine neuen Pferde gespawnt (z.B. während des Reitens). */
  private spawningPaused = false;

  // wiederverwendbare Materialien
  private hideMat = new THREE.MeshLambertMaterial({ color: 0x6b3a1a });
  private maneMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
  private hoofMat = new THREE.MeshLambertMaterial({ color: 0x1a0e08 });
  private eyeMat = new THREE.MeshLambertMaterial({ color: 0x0a0604 });
  private saddleMat = new THREE.MeshLambertMaterial({ color: 0x7c1f1f });
  private goldMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });

  constructor() {
    // erstes Pferd bekommt eine zufällige Distanz im Bereich 1500..4500
    this.nextSpawnDistance = 1500 + Math.random() * 3000;
  }

  /** Vom Game gesetzt: solange true, keine neuen Spawns. */
  pauseSpawning(paused: boolean) {
    this.spawningPaused = paused;
  }

  /**
   * @param playerZ aktuelle Spieler-Z-Position (negativ in Laufrichtung)
   * @param distance aktuell gelaufene Distanz (≈ Punkte)
   */
  update(playerZ: number, distance: number): void {
    // Aufräumen: was hinter dem Spieler ist, entfernen
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p.mesh.position.z > playerZ + WORLD.despawnDistance) {
        this.group.remove(p.mesh);
        this.active.splice(i, 1);
      }
    }

    // Neu spawnen, wenn die Distanz-Schwelle überschritten wurde
    // und Spawning nicht pausiert ist.
    if (!this.spawningPaused && distance >= this.nextSpawnDistance) {
      // weit vor dem Spieler platzieren, damit er es kommen sieht
      const spawnZ = playerZ - 100;
      this.spawnHorse(spawnZ);
      // nächstes Pferd zufällig in 1500..4500 Punkten
      this.nextSpawnDistance = distance + 1500 + Math.random() * 3000;
    }
  }

  private spawnHorse(z: number) {
    const lane = Math.floor(Math.random() * 3);
    const horse = this.buildHorse();
    horse.position.set(LANE_X[lane], 0, z);
    // leicht gedreht, damit es interessanter aussieht und nicht starr nach vorn schaut
    horse.rotation.y = -0.15;
    this.group.add(horse);

    // Hitbox großzügig - der Spieler soll das Pferd leicht treffen
    const hb = new THREE.Box3(
      new THREE.Vector3(LANE_X[lane] - 1.0, 0, z - 1.3),
      new THREE.Vector3(LANE_X[lane] + 1.0, 2.2, z + 1.3)
    );

    this.active.push({ kind: 'horse', mesh: horse, lane, hitbox: hb, z });
  }

  /** Pferd aus Primitives - Körper, Hals, Kopf, Beine, Mähne, Schweif, Sattel. */
  private buildHorse(): THREE.Group {
    const horse = new THREE.Group();

    // Körper (Rumpf) - liegender Zylinder
    const bodyGeo = new THREE.CylinderGeometry(0.45, 0.42, 1.6, 14);
    const body = new THREE.Mesh(bodyGeo, this.hideMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 1.35, 0);
    body.castShadow = true;
    horse.add(body);

    // Brust - leicht dickere Kugel vorne
    const chest = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 10),
      this.hideMat
    );
    chest.position.set(0, 1.35, 0.7);
    chest.scale.set(0.95, 0.9, 1);
    horse.add(chest);

    // Hinterteil - dickere Kugel hinten
    const rear = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 12, 10),
      this.hideMat
    );
    rear.position.set(0, 1.4, -0.75);
    rear.scale.set(0.95, 1, 1);
    horse.add(rear);

    // Hals - geneigter Zylinder
    const neckGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.85, 12);
    const neck = new THREE.Mesh(neckGeo, this.hideMat);
    neck.position.set(0, 1.85, 0.85);
    neck.rotation.x = -0.5;
    neck.castShadow = true;
    horse.add(neck);

    // Kopf - länglicher Block (eher eine Schnauze)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.2, 1.15);
    headGroup.rotation.x = -0.25;
    horse.add(headGroup);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.34, 0.7),
      this.hideMat
    );
    head.position.set(0, 0, 0.1);
    headGroup.add(head);

    // Schnauze - vorne etwas schmaler
    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.3),
      this.hideMat
    );
    muzzle.position.set(0, -0.04, 0.5);
    headGroup.add(muzzle);

    // Augen
    for (const dx of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        this.eyeMat
      );
      eye.position.set(dx, 0.06, 0.18);
      headGroup.add(eye);
    }

    // Ohren - zwei spitze Kegel oben
    for (const dx of [-0.1, 0.1]) {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.18, 6),
        this.hideMat
      );
      ear.position.set(dx, 0.22, -0.1);
      headGroup.add(ear);
    }

    // Mähne - mehrere kleine Boxen entlang des Halses
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.15),
        this.maneMat
      );
      // entlang der Hals-Linie von (y=1.5, z=0.5) bis (y=2.1, z=1.1)
      mane.position.set(0, 1.55 + t * 0.55, 0.55 + t * 0.55);
      mane.rotation.x = -0.5;
      horse.add(mane);
    }

    // Schweif - dunkler Kegel hinten
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.7, 6),
      this.maneMat
    );
    tail.position.set(0, 1.15, -1.25);
    tail.rotation.x = 1.0;
    horse.add(tail);

    // Beine - 4 Zylinder
    for (const dx of [-0.3, 0.3]) {
      for (const dz of [0.55, -0.55]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.08, 1.2, 8),
          this.hideMat
        );
        leg.position.set(dx, 0.6, dz);
        leg.castShadow = true;
        horse.add(leg);

        // Huf
        const hoof = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.15, 8),
          this.hoofMat
        );
        hoof.position.set(dx, 0.07, dz);
        horse.add(hoof);
      }
    }

    // Sattel - kleine Form auf dem Rücken
    const saddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.18, 0.7),
      this.saddleMat
    );
    saddle.position.set(0, 1.85, 0);
    horse.add(saddle);

    // Sattel-Knauf vorne (goldene Verzierung)
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      this.goldMat
    );
    knob.position.set(0, 1.97, 0.3);
    horse.add(knob);

    // Glow-Ring am Boden, damit der Spieler das Pferd aus der Distanz
    // als "etwas Besonderes" erkennt
    const glowGeo = new THREE.RingGeometry(0.7, 1.3, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffd96b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    glow.name = 'glow';
    horse.add(glow);

    return horse;
  }

  /**
   * Prüft Kollision mit dem Spieler. Gibt das berührte Power-Up zurück
   * und entfernt es aus der Welt. null wenn keins getroffen wurde.
   */
  checkPickup(playerBox: THREE.Box3): PowerUp | null {
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      if (p.hitbox.intersectsBox(playerBox)) {
        this.group.remove(p.mesh);
        this.active.splice(i, 1);
        return p;
      }
    }
    return null;
  }

  /**
   * Animiert das Glow-Ring um die Power-Ups (Pulsieren),
   * damit sie aus der Distanz auffallen.
   */
  animate(runTime: number) {
    for (const p of this.active) {
      const glow = p.mesh.getObjectByName('glow') as THREE.Mesh | undefined;
      if (glow) {
        const pulse = 1 + Math.sin(runTime * 4) * 0.15;
        glow.scale.set(pulse, pulse, 1);
        (glow.material as THREE.MeshBasicMaterial).opacity =
          0.35 + Math.sin(runTime * 4) * 0.15;
      }
      // leichtes Hochbewegen des ganzen Pferds (atmen)
      p.mesh.position.y = Math.sin(runTime * 2) * 0.04;
    }
  }

  clear() {
    for (const p of this.active) this.group.remove(p.mesh);
    this.active.length = 0;
  }

  reset() {
    this.clear();
    this.spawningPaused = false;
    this.nextSpawnDistance = 1500 + Math.random() * 3000;
  }
}
