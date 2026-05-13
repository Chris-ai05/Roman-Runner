import * as THREE from 'three';
import { LANE_X, PLAYER, COLORS } from './constants';
import type { Action } from './input';

export class Player {
  readonly mesh: THREE.Group;
  readonly hitbox = new THREE.Box3();

  private lane = 1; // 0=links, 1=mitte, 2=rechts
  private targetLane = 1;
  private laneSwitchT = 0; // 0..1 für Lerp

  private isJumping = false;
  private jumpT = 0;

  private isDucking = false;
  private duckT = 0;

  // Hitbox-Größe (wird beim Ducken kleiner)
  private bodyHeight = PLAYER.size * 1.6;

  constructor() {
    this.mesh = new THREE.Group();

    // ==========================================
// DETAILLIERTER RÖMISCHER CHARAKTER
// Für Three.js Jump & Run
// ==========================================

class RomanCharacter {
  constructor() {
    this.mesh = new THREE.Group();

    this.bodyHeight = PLAYER.size * 1.2;
    this.createCharacter();
  }

  createCharacter() {

    // ==========================================
    // MATERIALIEN
    // ==========================================

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd7b08a,
      roughness: 0.9,
      metalness: 0.0
    });

    const tunicMat = new THREE.MeshStandardMaterial({
      color: 0x9c4f2f,
      roughness: 0.85
    });

    const clothWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xe8dfcf,
      roughness: 1
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x4b2e1f,
      roughness: 1
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.25
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x777777,
      metalness: 0.6,
      roughness: 0.5
    });

    // ==========================================
    // TUNIKA / KÖRPER
    // ==========================================

    const bodyGeo = new THREE.BoxGeometry(
      PLAYER.size * 0.9,
      this.bodyHeight,
      PLAYER.size * 0.65
    );

    const body = new THREE.Mesh(bodyGeo, tunicMat);
    body.position.y = this.bodyHeight / 2;
    body.castShadow = true;
    body.name = "body";
    this.mesh.add(body);

    // Goldene Tunika-Verzierungen
    const trimGeo = new THREE.BoxGeometry(
      PLAYER.size * 0.95,
      0.05,
      PLAYER.size * 0.68
    );

    const trimTop = new THREE.Mesh(trimGeo, goldMat);
    trimTop.position.y = this.bodyHeight - 0.12;
    body.add(trimTop);

    const trimBottom = new THREE.Mesh(trimGeo, goldMat);
    trimBottom.position.y = -this.bodyHeight / 2 + 0.12;
    body.add(trimBottom);

    // ==========================================
    // SCHULTERUMHANG / CAPE
    // ==========================================

    const capeGeo = new THREE.BoxGeometry(
      PLAYER.size * 1.0,
      this.bodyHeight * 0.9,
      0.05
    );

    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x7b1010,
      roughness: 1
    });

    const cape = new THREE.Mesh(capeGeo, capeMat);

    cape.position.set(
      0,
      this.bodyHeight * 0.45,
      -PLAYER.size * 0.38
    );

    cape.castShadow = true;
    this.mesh.add(cape);

    // ==========================================
    // KOPF
    // ==========================================

    const headGeo = new THREE.SphereGeometry(
      PLAYER.size * 0.34,
      24,
      24
    );

    const head = new THREE.Mesh(headGeo, skinMat);

    head.position.y = this.bodyHeight + PLAYER.size * 0.28;
    head.castShadow = true;
    head.name = "head";

    this.mesh.add(head);

    // ==========================================
    // HAARE
    // ==========================================

    const hairGeo = new THREE.SphereGeometry(
      PLAYER.size * 0.36,
      20,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x3a2416,
      roughness: 1
    });

    const hair = new THREE.Mesh(hairGeo, hairMat);

    hair.position.y = PLAYER.size * 0.06;

    head.add(hair);

    // ==========================================
    // AUGEN
    // ==========================================

    const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);

    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x111111
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.02, 0.28);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.02, 0.28);

    head.add(leftEye);
    head.add(rightEye);

    // ==========================================
    // NASE
    // ==========================================

    const noseGeo = new THREE.BoxGeometry(0.03, 0.07, 0.03);

    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.03, 0.31);

    head.add(nose);

    // ==========================================
    // LORBEERKRANZ
    // ==========================================

    const wreathGeo = new THREE.TorusGeometry(
      PLAYER.size * 0.38,
      0.035,
      10,
      32
    );

    const wreath = new THREE.Mesh(wreathGeo, goldMat);

    wreath.position.y = PLAYER.size * 0.12;
    wreath.rotation.x = Math.PI / 2;

    head.add(wreath);

    // Kleine Blätter am Kranz
    for (let i = 0; i < 14; i++) {

      const leafGeo = new THREE.ConeGeometry(0.025, 0.08, 4);

      const leaf = new THREE.Mesh(leafGeo, goldMat);

      const angle = (i / 14) * Math.PI * 2;

      leaf.position.set(
        Math.cos(angle) * PLAYER.size * 0.38,
        Math.sin(angle) * PLAYER.size * 0.02,
        Math.sin(angle) * PLAYER.size * 0.38
      );

      leaf.rotation.z = angle;
      leaf.rotation.x = Math.PI / 3;

      head.add(leaf);
    }

    // ==========================================
    // ARME
    // ==========================================

    const armGeo = new THREE.CapsuleGeometry(
      PLAYER.size * 0.09,
      PLAYER.size * 0.45,
      6,
      12
    );

    const leftArm = new THREE.Mesh(armGeo, skinMat);

    leftArm.position.set(
      -PLAYER.size * 0.55,
      this.bodyHeight * 0.7,
      0
    );

    leftArm.rotation.z = 0.15;
    leftArm.castShadow = true;

    this.mesh.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);

    rightArm.position.set(
      PLAYER.size * 0.55,
      this.bodyHeight * 0.7,
      0
    );

    rightArm.rotation.z = -0.15;
    rightArm.castShadow = true;

    this.mesh.add(rightArm);

    // ==========================================
    // LEDERRIEMEN
    // ==========================================

    const beltGeo = new THREE.BoxGeometry(
      PLAYER.size,
      0.12,
      PLAYER.size * 0.72
    );

    const belt = new THREE.Mesh(beltGeo, leatherMat);

    belt.position.y = this.bodyHeight * 0.48;
    belt.castShadow = true;

    this.mesh.add(belt);

    // Goldene Gürtelschnalle
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);

    const buckle = new THREE.Mesh(buckleGeo, goldMat);

    buckle.position.set(
      0,
      this.bodyHeight * 0.48,
      PLAYER.size * 0.37
    );

    this.mesh.add(buckle);

    // ==========================================
    // BEINE
    // ==========================================

    const legGeo = new THREE.CapsuleGeometry(
      PLAYER.size * 0.1,
      PLAYER.size * 0.5,
      6,
      12
    );

    const leftLeg = new THREE.Mesh(legGeo, skinMat);

    leftLeg.position.set(
      -PLAYER.size * 0.18,
      -PLAYER.size * 0.12,
      0
    );

    leftLeg.castShadow = true;

    this.mesh.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, skinMat);

    rightLeg.position.set(
      PLAYER.size * 0.18,
      -PLAYER.size * 0.12,
      0
    );

    rightLeg.castShadow = true;

    this.mesh.add(rightLeg);

    // ==========================================
    // RÖMISCHE SANDALEN
    // ==========================================

    const sandalGeo = new THREE.BoxGeometry(
      PLAYER.size * 0.22,
      0.05,
      PLAYER.size * 0.4
    );

    const leftSandal = new THREE.Mesh(sandalGeo, leatherMat);

    leftSandal.position.set(
      -PLAYER.size * 0.18,
      -PLAYER.size * 0.48,
      PLAYER.size * 0.03
    );

    this.mesh.add(leftSandal);

    const rightSandal = new THREE.Mesh(sandalGeo, leatherMat);

    rightSandal.position.set(
      PLAYER.size * 0.18,
      -PLAYER.size * 0.48,
      PLAYER.size * 0.03
    );

    this.mesh.add(rightSandal);

    // ==========================================
    // GLADIUS (RÖMISCHES SCHWERT)
    // ==========================================

    const swordGroup = new THREE.Group();

    // Klinge
    const bladeGeo = new THREE.BoxGeometry(
      0.07,
      PLAYER.size * 0.5,
      0.02
    );

    const blade = new THREE.Mesh(bladeGeo, ironMat);

    blade.position.y = -0.15;

    swordGroup.add(blade);

    // Griff
    const handleGeo = new THREE.CylinderGeometry(
      0.03,
      0.03,
      0.18,
      8
    );

    const handle = new THREE.Mesh(handleGeo, leatherMat);

    handle.rotation.z = Math.PI / 2;
    handle.position.y = 0.15;

    swordGroup.add(handle);

    // Parierstange
    const guardGeo = new THREE.BoxGeometry(
      0.12,
      0.03,
      0.05
    );

    const guard = new THREE.Mesh(guardGeo, goldMat);

    guard.position.y = 0.05;

    swordGroup.add(guard);

    swordGroup.position.set(
      PLAYER.size * 0.48,
      this.bodyHeight * 0.35,
      -PLAYER.size * 0.35
    );

    swordGroup.rotation.z = 0.2;

    this.mesh.add(swordGroup);

    // ==========================================
    // GESAMT-SKALIERUNG
    // ==========================================

    this.mesh.scale.set(1, 1, 1);

    // Schatten für alle Elemente
    this.mesh.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }
}

    this.mesh.position.set(LANE_X[1], 0, 0);
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
    // --- Lane-Wechsel (smooth lerp) ---
    if (this.lane !== this.targetLane || this.laneSwitchT < 1) {
      this.laneSwitchT = Math.min(1, this.laneSwitchT + dt / PLAYER.laneSwitchDuration);
      const fromX = LANE_X[this.lane];
      const toX = LANE_X[this.targetLane];
      // Ease-out
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
        // Parabel: 4 * h * t * (1 - t)
        this.mesh.position.y = 4 * PLAYER.jumpHeight * this.jumpT * (1 - this.jumpT);
      }
    } else {
      this.mesh.position.y = 0;
    }

    // --- Ducken (skaliert den Körper) ---
    const body = this.mesh.getObjectByName('body') as THREE.Mesh;
    const head = this.mesh.getObjectByName('head') as THREE.Mesh;
    if (this.isDucking) {
      this.duckT += dt / PLAYER.duckDuration;
      if (this.duckT >= 1) {
        this.isDucking = false;
        this.duckT = 0;
        body.scale.y = 1;
        head.position.y = this.bodyHeight + PLAYER.size * 0.3;
      } else {
        // Dreiecks-Verlauf: schnell runter, schnell wieder hoch
        const tri = this.duckT < 0.5 ? this.duckT * 2 : (1 - this.duckT) * 2;
        const squash = 1 - tri * 0.55;
        body.scale.y = squash;
        body.position.y = (this.bodyHeight * squash) / 2;
        head.position.y = this.bodyHeight * squash + PLAYER.size * 0.3;
      }
    } else {
      body.scale.y = 1;
      body.position.y = this.bodyHeight / 2;
    }

    // --- Lauf-Animation: leichtes Wackeln ---
    if (!this.isJumping) {
      this.mesh.rotation.z = Math.sin(runTime * 14) * 0.05;
      this.mesh.position.y += Math.abs(Math.sin(runTime * 14)) * 0.05;
    } else {
      this.mesh.rotation.z = 0;
    }

    // --- Hitbox aktualisieren ---
    this.updateHitbox();
  }

  private updateHitbox() {
    const p = this.mesh.position;
    const currentHeight = this.isDucking
      ? this.bodyHeight * (1 - Math.min(this.duckT < 0.5 ? this.duckT * 2 : (1 - this.duckT) * 2, 1) * 0.55)
      : this.bodyHeight;

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
    this.mesh.rotation.z = 0;
  }
}
