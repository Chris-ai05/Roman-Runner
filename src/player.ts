import * as THREE from 'three';
import { LANE_X, PLAYER, COLORS } from './constants';
import type { Action } from './input';

/**
 * Spielfigur - ein römischer Athlet mit Tunika, Cape und Lorbeerkranz.
 *
 * Aufbau: die Figur ist auf mehreren benannten Pivot-Gruppen aufgebaut,
 * sodass wir Arme/Beine/Torso unabhängig animieren können.
 *
 * Hierarchie:
 *   mesh (root, wird vom Game positioniert)
 *   ├─ torso (kippt beim Ducken nach vorn)
 *   │  ├─ headPivot (Kopf + Lorbeerkranz)
 *   │  ├─ leftArmPivot / rightArmPivot (schwingen)
 *   │  └─ tunic, gürtel, etc. (statisch)
 *   └─ leftLegPivot / rightLegPivot (schwingen, eigenständig)
 */
export class Player {
  readonly mesh: THREE.Group;
  readonly hitbox = new THREE.Box3();

  // Lane-State
  private lane = 1;
  private targetLane = 1;
  private laneSwitchT = 0;

  // Action-State
  private isJumping = false;
  private jumpT = 0;
  private isDucking = false;
  private duckT = 0;

  // Body-Referenzen für Animation
  private torso!: THREE.Group;
  private headPivot!: THREE.Group;
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;

  // Hitbox-Konstanten
  private readonly bodyHeight = PLAYER.size * 1.9;

  constructor() {
    this.mesh = new THREE.Group();
    this.buildFigure();
    this.mesh.position.set(LANE_X[1], 0, 0);
  }

  private buildFigure() {
    const s = PLAYER.size;

    // === Materialien ===
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9a87a });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x2d1810 });
    const tunicMat = new THREE.MeshLambertMaterial({ color: COLORS.player });
    const tunicTrimMat = new THREE.MeshLambertMaterial({ color: 0xf2e3a0 });
    const beltMat = new THREE.MeshLambertMaterial({ color: 0x6b3a1a });
    const sandalMat = new THREE.MeshLambertMaterial({ color: 0x4a2d1a });
    const goldMat = new THREE.MeshLambertMaterial({ color: COLORS.gold });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x4a7c2f });
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a0e08 });

    // === Torso-Pivot ===
    // Pivot liegt an der Hüfte, damit Ducken (Vorbeugen) sich natürlich anfühlt.
    this.torso = new THREE.Group();
    this.torso.position.y = s * 0.9;
    this.mesh.add(this.torso);

    // === Tunika (konischer Zylinder statt Box) ===
    const tunicGeo = new THREE.CylinderGeometry(s * 0.55, s * 0.42, s * 0.9, 16);
    const tunic = new THREE.Mesh(tunicGeo, tunicMat);
    tunic.position.y = s * 0.05;
    tunic.castShadow = true;
    this.torso.add(tunic);

    // Tunika-Saum entfernt - wirkte als heller Kreis um die Beine.

    // Vertikaler Tunika-Streifen (clavus) - typisch römisch
    const clavusGeo = new THREE.BoxGeometry(s * 0.08, s * 0.85, 0.01);
    const clavus = new THREE.Mesh(clavusGeo, tunicTrimMat);
    clavus.position.set(s * 0.15, s * 0.05, s * 0.45);
    this.torso.add(clavus);

    // === Gürtel ===
    const beltGeo = new THREE.TorusGeometry(s * 0.5, s * 0.06, 6, 16);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = s * 0.1;
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1, 1, 0.8);
    this.torso.add(belt);

    // Gürtel-Schnalle (goldenes Quadrat vorne)
    const buckleGeo = new THREE.BoxGeometry(s * 0.18, s * 0.14, s * 0.04);
    const buckle = new THREE.Mesh(buckleGeo, goldMat);
    buckle.position.set(0, s * 0.1, s * 0.42);
    this.torso.add(buckle);

    // Cape und Brosche entfernt.

    // === Kopf-Pivot ===
    this.headPivot = new THREE.Group();
    this.headPivot.position.y = s * 0.95;
    this.torso.add(this.headPivot);

    // Hals
    const neckGeo = new THREE.CylinderGeometry(s * 0.16, s * 0.18, s * 0.18, 10);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = -s * 0.05;
    this.headPivot.add(neck);

    // Kopf - leicht eiförmig
    const headGeo = new THREE.SphereGeometry(s * 0.32, 20, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = s * 0.25;
    head.scale.y = 1.15;
    head.castShadow = true;
    this.headPivot.add(head);

    // Haar - dunkle Halbkugel
    const hairGeo = new THREE.SphereGeometry(
      s * 0.34,
      20,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.6
    );
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = s * 0.27;
    hair.scale.y = 1.15;
    this.headPivot.add(hair);

    // Pony - kleine Locken über der Stirn
    for (let i = -2; i <= 2; i++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 8, 6), hairMat);
      curl.position.set(i * s * 0.07, s * 0.4, s * 0.27);
      this.headPivot.add(curl);
    }

    // Augen
    for (const dx of [-s * 0.1, s * 0.1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.035, 8, 6), eyeMat);
      eye.position.set(dx, s * 0.25, s * 0.28);
      this.headPivot.add(eye);
    }

    // Nase - kleine Pyramide nach vorne
    const noseGeo = new THREE.ConeGeometry(s * 0.05, s * 0.12, 4);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, s * 0.2, s * 0.31);
    nose.rotation.x = Math.PI / 2;
    this.headPivot.add(nose);

    // Mund
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.1, s * 0.018, s * 0.02),
      new THREE.MeshLambertMaterial({ color: 0x6a2818 })
    );
    mouth.position.set(0, s * 0.12, s * 0.3);
    this.headPivot.add(mouth);

    // === Lorbeerkranz aus einzelnen Blättern ===
    const wreathRadius = s * 0.4;
    const leafCount = 14;
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2;
      // Lücke vorne lassen (dort sind die Locken)
      if (Math.abs(angle - Math.PI) < 0.6) continue;

      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.07, 6, 4),
        leafMat
      );
      leaf.scale.set(0.45, 1.4, 0.35);
      leaf.position.set(
        Math.cos(angle) * wreathRadius,
        s * 0.45,
        Math.sin(angle) * wreathRadius
      );
      leaf.rotation.y = angle + Math.PI / 2;
      leaf.rotation.z = 0.3;
      this.headPivot.add(leaf);
    }

    // Goldene Bänder (Diadem-Andeutung)
    for (const yOff of [-0.02, 0.02]) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(s * 0.4, s * 0.015, 4, 24),
        goldMat
      );
      band.position.y = s * 0.45 + yOff * s;
      band.rotation.x = Math.PI / 2;
      this.headPivot.add(band);
    }

    // === Arme ===
    // Spieler läuft nach -z, Kamera schaut von +z. Aus Kamera-Sicht:
    // +x = links der Figur, -x = rechts der Figur.
    this.leftArmPivot = this.buildArm(skinMat, tunicMat);
    this.rightArmPivot = this.buildArm(skinMat, tunicMat);
    this.leftArmPivot.position.set(-s * 0.45, s * 0.7, 0);
    this.rightArmPivot.position.set(s * 0.45, s * 0.7, 0);
    this.torso.add(this.leftArmPivot);
    this.torso.add(this.rightArmPivot);

    // === Beine ===
    // Beine hängen direkt am Root, nicht am Torso - sonst würden sie beim
    // Ducken (Torso-Kippen) mit nach vorn kippen.
    this.leftLegPivot = this.buildLeg(skinMat, sandalMat);
    this.rightLegPivot = this.buildLeg(skinMat, sandalMat);
    this.leftLegPivot.position.set(-s * 0.18, s * 0.9, 0);
    this.rightLegPivot.position.set(s * 0.18, s * 0.9, 0);
    this.mesh.add(this.leftLegPivot);
    this.mesh.add(this.rightLegPivot);
  }

  private buildArm(skinMat: THREE.Material, sleeveMat: THREE.Material): THREE.Group {
    const s = PLAYER.size;
    const pivot = new THREE.Group();

    // Schulter (Gelenk-Kugel)
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 10, 8), sleeveMat);
    pivot.add(shoulder);

    // Kurzer Tunika-Ärmel
    const sleeveGeo = new THREE.CylinderGeometry(s * 0.14, s * 0.13, s * 0.25, 10);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.y = -s * 0.15;
    pivot.add(sleeve);

    // Oberarm
    const upperGeo = new THREE.CylinderGeometry(s * 0.1, s * 0.09, s * 0.4, 10);
    const upper = new THREE.Mesh(upperGeo, skinMat);
    upper.position.y = -s * 0.45;
    upper.castShadow = true;
    pivot.add(upper);

    // Ellbogen
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(s * 0.09, 8, 6), skinMat);
    elbow.position.y = -s * 0.65;
    pivot.add(elbow);

    // Unterarm
    const lowerGeo = new THREE.CylinderGeometry(s * 0.09, s * 0.08, s * 0.4, 10);
    const lower = new THREE.Mesh(lowerGeo, skinMat);
    lower.position.y = -s * 0.85;
    pivot.add(lower);

    // Hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(s * 0.1, 10, 8), skinMat);
    hand.position.y = -s * 1.05;
    hand.scale.set(0.9, 1.1, 0.7);
    pivot.add(hand);

    return pivot;
  }

  private buildLeg(skinMat: THREE.Material, sandalMat: THREE.Material): THREE.Group {
    const s = PLAYER.size;
    const pivot = new THREE.Group();

    // Oberschenkel
    const thighGeo = new THREE.CylinderGeometry(s * 0.13, s * 0.11, s * 0.45, 10);
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.y = -s * 0.25;
    thigh.castShadow = true;
    pivot.add(thigh);

    // Knie
    const knee = new THREE.Mesh(new THREE.SphereGeometry(s * 0.11, 8, 6), skinMat);
    knee.position.y = -s * 0.5;
    pivot.add(knee);

    // Wade
    const calfGeo = new THREE.CylinderGeometry(s * 0.11, s * 0.08, s * 0.45, 10);
    const calf = new THREE.Mesh(calfGeo, skinMat);
    calf.position.y = -s * 0.75;
    pivot.add(calf);

    // Sandalen-Riemen um die Wade (typisch römisch)
    for (const yOff of [-0.65, -0.85]) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(s * 0.1, s * 0.015, 4, 12),
        sandalMat
      );
      strap.position.y = yOff * s;
      strap.rotation.x = Math.PI / 2;
      pivot.add(strap);
    }

    // Fuß / Sandalensohle
    const footGeo = new THREE.BoxGeometry(s * 0.2, s * 0.08, s * 0.32);
    const foot = new THREE.Mesh(footGeo, sandalMat);
    foot.position.set(0, -s * 1.0, s * 0.05);
    pivot.add(foot);

    return pivot;
  }

  handle(action: Action) {
    switch (action) {
      case 'left':
        if (this.targetLane > 0) {
          this.targetLane--;
          this.laneSwitchT = 0;
        }
        break;
      case 'right':
        if (this.targetLane < 2) {
          this.targetLane++;
          this.laneSwitchT = 0;
        }
        break;
      case 'jump':
        if (!this.isJumping && !this.isDucking) {
          this.isJumping = true;
          this.jumpT = 0;
        }
        break;
      case 'duck':
        if (!this.isDucking && !this.isJumping) {
          this.isDucking = true;
          this.duckT = 0;
        }
        break;
    }
  }

  update(dt: number, runTime: number) {
    // --- Lane-Wechsel ---
    if (this.lane !== this.targetLane || this.laneSwitchT < 1) {
      this.laneSwitchT = Math.min(1, this.laneSwitchT + dt / PLAYER.laneSwitchDuration);
      const fromX = LANE_X[this.lane];
      const toX = LANE_X[this.targetLane];
      const t = 1 - Math.pow(1 - this.laneSwitchT, 2);
      this.mesh.position.x = fromX + (toX - fromX) * t;
      if (this.laneSwitchT >= 1) this.lane = this.targetLane;
    }

    // --- Sprung (Parabel) ---
    if (this.isJumping) {
      this.jumpT += dt / PLAYER.jumpDuration;
      if (this.jumpT >= 1) {
        this.isJumping = false;
        this.jumpT = 0;
        this.mesh.position.y = 0;
      } else {
        this.mesh.position.y = 4 * PLAYER.jumpHeight * this.jumpT * (1 - this.jumpT);
      }
    } else {
      this.mesh.position.y = 0;
    }

    // --- Ducken (Oberkörper kippt nach vorn) ---
    if (this.isDucking) {
      this.duckT += dt / PLAYER.duckDuration;
      if (this.duckT >= 1) {
        this.isDucking = false;
        this.duckT = 0;
      }
    }
    // Profil: 0..0.15 = Runter, 0.15..0.85 = halten, 0.85..1 = Hoch.
    // Dadurch ist der Spieler den Großteil der Duck-Phase wirklich klein,
    // statt nur in einem einzigen Frame.
    let duckPhase = 0;
    if (this.isDucking) {
      if (this.duckT < 0.15) duckPhase = this.duckT / 0.15;
      else if (this.duckT < 0.85) duckPhase = 1;
      else duckPhase = (1 - this.duckT) / 0.15;
    }
    this.torso.rotation.x = duckPhase * 0.9;
    const baseHip = PLAYER.size * 0.9;
    this.torso.position.y = baseHip - duckPhase * PLAYER.size * 0.35;

    // --- Lauf-Animation: Arme + Beine schwingen ---
    if (!this.isJumping) {
      const cycle = runTime * 9;
      const swing = Math.sin(cycle);
      this.leftLegPivot.rotation.x = swing * 0.7;
      this.rightLegPivot.rotation.x = -swing * 0.7;
      this.leftArmPivot.rotation.x = -swing * 0.6;
      this.rightArmPivot.rotation.x = swing * 0.6;

      // Vertikaler Bounce
      this.mesh.position.y += Math.abs(Math.sin(cycle)) * 0.06;

      // Kopf wackelt minimal
      this.headPivot.rotation.z = Math.sin(cycle) * 0.04;
    } else {
      // Sprung-Pose: Beine angewinkelt, Arme nach hinten
      this.leftLegPivot.rotation.x = -0.6;
      this.rightLegPivot.rotation.x = -0.4;
      this.leftArmPivot.rotation.x = 0.5;
      this.rightArmPivot.rotation.x = 0.5;
      this.headPivot.rotation.z = 0;
    }

    this.updateHitbox(duckPhase);
  }

  private updateHitbox(duckPhase: number) {
    const p = this.mesh.position;
    const currentHeight = this.bodyHeight * (1 - duckPhase * 0.55);
    const halfX = PLAYER.size * 0.4;
    const halfZ = PLAYER.size * 0.35;
    this.hitbox.min.set(p.x - halfX, p.y, p.z - halfZ);
    this.hitbox.max.set(p.x + halfX, p.y + currentHeight, p.z + halfZ);
  }

  reset() {
    this.lane = 1;
    this.targetLane = 1;
    this.laneSwitchT = 1;
    this.isJumping = false;
    this.isDucking = false;
    this.jumpT = 0;
    this.duckT = 0;
    this.mesh.position.set(LANE_X[1], 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    this.torso.position.y = PLAYER.size * 0.9;
    this.leftArmPivot.rotation.set(0, 0, 0);
    this.rightArmPivot.rotation.set(0, 0, 0);
    this.leftLegPivot.rotation.set(0, 0, 0);
    this.rightLegPivot.rotation.set(0, 0, 0);
  }
}
