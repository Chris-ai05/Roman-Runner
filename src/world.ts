import * as THREE from 'three';
import { COLORS, WORLD } from './constants';

/**
 * Die Welt besteht aus Straßensegmenten und Dekoration links/rechts.
 * Statt unendlich neue Geometrie zu erzeugen, recyceln wir Segmente:
 * Wenn eines hinter dem Spieler verschwindet, schieben wir es nach vorne.
 */
export class World {
  readonly group = new THREE.Group();

  private roadSegments: THREE.Mesh[] = [];
  private decorations: THREE.Object3D[] = [];

  // Wiederverwendbare Geometrien/Materialien
  private roadGeo: THREE.PlaneGeometry;
  private roadMat: THREE.MeshLambertMaterial;
  private stripeGeo: THREE.PlaneGeometry;
  private stripeMat: THREE.MeshLambertMaterial;
  private grassGeo: THREE.PlaneGeometry;
  private grassMat: THREE.MeshLambertMaterial;

  private columnGeo = new THREE.CylinderGeometry(0.5, 0.55, 5, 12);
  private columnTopGeo = new THREE.BoxGeometry(1.4, 0.3, 1.4);
  private columnMat = new THREE.MeshLambertMaterial({ color: COLORS.marble });

  private statueBodyGeo = new THREE.BoxGeometry(0.8, 2, 0.6);
  private statueHeadGeo = new THREE.SphereGeometry(0.3, 8, 6);
  private statueBaseGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
  private statueMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });

  constructor() {
    // Road
    this.roadGeo = new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.segmentLength);
    this.roadMat = new THREE.MeshLambertMaterial({ color: COLORS.road });
    this.stripeGeo = new THREE.PlaneGeometry(0.1, WORLD.segmentLength);
    this.stripeMat = new THREE.MeshLambertMaterial({ color: COLORS.roadStripe });
    this.grassGeo = new THREE.PlaneGeometry(40, WORLD.segmentLength);
    this.grassMat = new THREE.MeshLambertMaterial({ color: COLORS.grass });

    // Initiale Segmente erzeugen
    for (let i = 0; i < WORLD.visibleSegments; i++) {
      this.spawnSegment(i * WORLD.segmentLength - WORLD.segmentLength * 2);
    }
  }

  private spawnSegment(z: number) {
    const seg = new THREE.Group();
    seg.position.z = z;

    // Boden (Gras/Erde) - weit darunter
    const grass = new THREE.Mesh(this.grassGeo, this.grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    seg.add(grass);

    // Straße
    const road = new THREE.Mesh(this.roadGeo, this.roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    seg.add(road);

    // Fahrbahn-Trennstreifen (zwei, zwischen den Lanes)
    for (const x of [-1.1, 1.1]) {
      const stripe = new THREE.Mesh(this.stripeGeo, this.stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.01, 0);
      seg.add(stripe);
    }

    // Dekoration: pro Segment ein paar Säulen/Statuen rechts und links
    this.decorateSegment(seg);

    this.group.add(seg);
    this.roadSegments.push(seg as unknown as THREE.Mesh);
  }

  private decorateSegment(seg: THREE.Group) {
    // Pro Seite 2 Dekorationen pro Segment
    for (let side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const localZ = (i - 0.5) * (WORLD.segmentLength / 2);
        const x = side * (WORLD.roadWidth / 2 + 2 + Math.random() * 1.5);
        const pick = Math.random();

        if (pick < 0.6) {
          // Säule mit Kapitell
          const col = new THREE.Group();
          const shaft = new THREE.Mesh(this.columnGeo, this.columnMat);
          shaft.position.y = 2.5;
          shaft.castShadow = true;
          col.add(shaft);
          const top = new THREE.Mesh(this.columnTopGeo, this.columnMat);
          top.position.y = 5.15;
          col.add(top);
          col.position.set(x, 0, localZ);
          seg.add(col);
          this.decorations.push(col);
        } else {
          // Statue
          const stat = new THREE.Group();
          const base = new THREE.Mesh(this.statueBaseGeo, this.statueMat);
          base.position.y = 0.25;
          stat.add(base);
          const body = new THREE.Mesh(this.statueBodyGeo, this.statueMat);
          body.position.y = 1.5;
          body.castShadow = true;
          stat.add(body);
          const head = new THREE.Mesh(this.statueHeadGeo, this.statueMat);
          head.position.y = 2.8;
          stat.add(head);
          stat.position.set(x, 0, localZ);
          // leicht zur Straße drehen
          stat.rotation.y = side * -Math.PI / 2;
          seg.add(stat);
          this.decorations.push(stat);
        }
      }
    }
  }

  /**
   * playerZ: aktuelle Z-Position des Spielers (negativ in Laufrichtung).
   * Segmente, die zu weit hinter dem Spieler sind, werden nach vorne verschoben.
   */
  update(playerZ: number) {
    const recycleZ = playerZ + WORLD.despawnDistance;

    for (const seg of this.roadSegments) {
      if (seg.position.z > recycleZ) {
        // hinter dem Spieler -> nach vorn versetzen
        // Finde das aktuell weiteste vordere Segment (kleinstes z)
        let minZ = Infinity;
        for (const s of this.roadSegments) {
          if (s.position.z < minZ) minZ = s.position.z;
        }
        seg.position.z = minZ - WORLD.segmentLength;

        // Dekoration in diesem Segment neu würfeln
        // (vereinfacht: wir lassen sie, das spart Aufwand - die Welt sieht trotzdem variantenreich aus)
      }
    }
  }

  /**
   * Setzt die Welt zurück: Segmente werden auf ihre initialen Z-Positionen platziert.
   * Nötig, weil der Spieler beim Neustart auf z=0 zurückspringt.
   */
  reset() {
    for (let i = 0; i < this.roadSegments.length; i++) {
      this.roadSegments[i].position.z = i * WORLD.segmentLength - WORLD.segmentLength * 2;
    }
  }
}
