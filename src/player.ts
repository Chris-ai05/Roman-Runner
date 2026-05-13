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

    // Körper - tunika-artige Form: Box mit terrakotta-Farbe
    const bodyGeo = new THREE.BoxGeometry(PLAYER.size, this.bodyHeight, PLAYER.size * 0.7);
    const bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.player });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = this.bodyHeight / 2;
    body.castShadow = true;
    body.name = 'body';
    this.mesh.add(body);

    // Kopf
    const headGeo = new THREE.SphereGeometry(PLAYER.size * 0.35, 12, 10);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xd9b48a });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = this.bodyHeight + PLAYER.size * 0.3;
    head.castShadow = true;
    head.name = 'head';
    this.mesh.add(head);

    // Lorbeerkranz - kleiner goldener Torus
    const wreathGeo = new THREE.TorusGeometry(PLAYER.size * 0.38, 0.06, 6, 16);
    const wreathMat = new THREE.MeshLambertMaterial({ color: COLORS.gold });
    const wreath = new THREE.Mesh(wreathGeo, wreathMat);
    wreath.position.y = this.bodyHeight + PLAYER.size * 0.5;
    wreath.rotation.x = Math.PI / 2;
    this.mesh.add(wreath);

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
