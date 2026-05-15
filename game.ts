import * as THREE from 'three';
import { COLORS, SPEED, WORLD } from './constants';
import { Input } from './input';
import { Player } from './player';
import { World } from './world';
import { Obstacles } from './obstacles';
import { PowerUps } from './powerups';
import { UI } from './ui';

type State = 'menu' | 'playing' | 'gameover';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private input = new Input();
  private ui = new UI();

  private player!: Player;
  private world!: World;
  private obstacles!: Obstacles;
  private powerups!: PowerUps;
  private mountVisual!: THREE.Group;

  private state: State = 'menu';
  private speed = SPEED.start;
  private distance = 0;
  private coins = 0;
  private runTime = 0;

  // Mounted-State: wenn > 0, reitet der Spieler ein Pferd
  private mountedT = 0;
  // Wie viel zusätzliche Speed gibt das Pferd (multiplikativ)
  private readonly mountSpeedFactor = 1.5;
  private readonly mountDuration = 10; // Sekunden

  private lastTime = 0;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 30, 120);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );

    this.setupLights();
    this.setupScene();
    this.setupEvents();

    // Eine initiale Render-Frame, damit man im Hintergrund die Szene sieht
    this.renderer.render(this.scene, this.camera);
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffe4b0, 0.55);
    this.scene.add(ambient);

    // Sonne aus dem Süden, warm
    const sun = new THREE.DirectionalLight(0xffd89c, 1.1);
    sun.position.set(15, 30, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    this.scene.add(sun);

    // Hemi für kalten Sky-Anteil
    const hemi = new THREE.HemisphereLight(0xfff0d0, 0x7a5a3a, 0.35);
    this.scene.add(hemi);
  }

  private setupScene() {
    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.world = new World();
    this.scene.add(this.world.group);

    this.obstacles = new Obstacles(this.player.mesh.position.z);
    this.scene.add(this.obstacles.group);

    this.powerups = new PowerUps();
    this.scene.add(this.powerups.group);

    // Mount-Visual: das Pferd, das unter dem Spieler erscheint, wenn er reitet.
    // Wir bauen es einmal und blenden es nach Bedarf ein/aus.
    // Es ist ein Geschwister-Objekt zur Spielfigur, nicht ihr Kind - so können
    // wir Player-Y und Pferd-Y unabhängig steuern (z.B. soll der Spieler
    // angehoben sein, das Pferd aber am Boden stehen).
    this.mountVisual = this.buildMountVisual();
    this.mountVisual.visible = false;
    this.scene.add(this.mountVisual);

    this.positionCamera();
  }

  /** Einfaches Pferd, das unter dem Spieler erscheint, wenn er reitet. */
  private buildMountVisual(): THREE.Group {
    const horse = new THREE.Group();
    const hide = new THREE.MeshLambertMaterial({ color: 0x6b3a1a });
    const mane = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
    const hoof = new THREE.MeshLambertMaterial({ color: 0x1a0e08 });

    // Rumpf
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.42, 1.6, 14),
      hide
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.75;
    body.castShadow = true;
    horse.add(body);

    // Hinten
    const rear = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), hide);
    rear.position.set(0, 0.8, -0.75);
    horse.add(rear);

    // Brust
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), hide);
    chest.position.set(0, 0.8, 0.7);
    horse.add(chest);

    // Hals + Kopf
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 0.85, 12),
      hide
    );
    neck.position.set(0, 1.25, 0.85);
    neck.rotation.x = -0.5;
    horse.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.7), hide);
    head.position.set(0, 1.55, 1.2);
    head.rotation.x = -0.25;
    horse.add(head);

    for (const dx of [-0.1, 0.1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), hide);
      ear.position.set(dx, 1.78, 1.05);
      horse.add(ear);
    }

    // Mähne
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.15), mane);
      m.position.set(0, 0.95 + t * 0.55, 0.55 + t * 0.55);
      m.rotation.x = -0.5;
      horse.add(m);
    }

    // Schweif
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 6), mane);
    tail.position.set(0, 0.55, -1.25);
    tail.rotation.x = 1.0;
    horse.add(tail);

    // Beine + Hufe
    for (const dx of [-0.3, 0.3]) {
      for (const dz of [0.55, -0.55]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.08, 1.2, 8),
          hide
        );
        leg.position.set(dx, 0, dz);
        horse.add(leg);

        const h = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.15, 8),
          hoof
        );
        h.position.set(dx, -0.55, dz);
        horse.add(h);
      }
    }

    // Sattel
    const saddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.18, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x7c1f1f })
    );
    saddle.position.set(0, 1.25, 0);
    horse.add(saddle);

    return horse;
  }

  private positionCamera() {
    // Verfolgt den Spieler von hinten oben
    const p = this.player.mesh.position;
    this.camera.position.set(p.x * 0.3, 4, p.z + 7);
    this.camera.lookAt(p.x * 0.3, 1.2, p.z - 6);
  }

  private setupEvents() {
    window.addEventListener('resize', this.onResize);
    this.ui.onStart(() => this.startRun());
  }

  private onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  start() {
    this.ui.showStart();
    this.loop(performance.now());
  }

  private startRun() {
    this.state = 'playing';
    this.speed = SPEED.start;
    this.distance = 0;
    this.coins = 0;
    this.runTime = 0;
    this.player.reset();
    this.world.reset();
    this.obstacles.reset(this.player.mesh.position.z);
    this.powerups.reset();
    this.mountedT = 0;
    this.mountVisual.visible = false;
    this.ui.setDistance(0);
    this.ui.setCoins(0);
    this.ui.hide();
  }

  private endRun() {
    this.state = 'gameover';
    const prev = parseInt(localStorage.getItem('rr_highscore') ?? '0', 10);
    const high = Math.max(prev, Math.floor(this.distance));
    localStorage.setItem('rr_highscore', String(high));
    this.ui.showGameOver(this.distance, this.coins, high);
  }

  private loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;

    if (this.state === 'playing') {
      this.tick(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private tick(dt: number) {
    this.runTime += dt;

    // Geschwindigkeit langsam erhöhen
    this.speed = Math.min(SPEED.max, this.speed + SPEED.acceleration * dt);

    // Mount-Timer abbauen, ggf. absteigen
    const isMounted = this.mountedT > 0;
    if (isMounted) {
      this.mountedT = Math.max(0, this.mountedT - dt);
      if (this.mountedT === 0) {
        this.dismount();
      }
    }
    const effectiveSpeed = isMounted ? this.speed * this.mountSpeedFactor : this.speed;

    // Spieler bewegt sich nach vorn (negatives Z)
    this.player.mesh.position.z -= effectiveSpeed * dt;
    this.distance += effectiveSpeed * dt;
    this.ui.setDistance(this.distance);
    this.ui.setMount(isMounted ? this.mountedT : 0);

    // Eingabe verarbeiten
    let action;
    while ((action = this.input.consume())) {
      this.player.handle(action);
    }

    this.player.update(dt, this.runTime);
    this.world.update(this.player.mesh.position.z);
    this.obstacles.update(dt, this.player.mesh.position.z, this.speed);
    this.powerups.update(this.player.mesh.position.z, this.distance);
    this.powerups.animate(this.runTime);

    // Mount-Visual folgt dem Spieler, falls geritten wird.
    // Spieler wird optisch angehoben, sodass er auf dem Sattel sitzt.
    if (isMounted) {
      const pp = this.player.mesh.position;
      this.mountVisual.position.set(pp.x, 0, pp.z);
      // Spieler bekommt einen Y-Offset, damit er auf dem Sattel sitzt.
      // Der Sattel ist bei y=1.25, der Spieler hat seine Füße normalerweise bei y=0,
      // also heben wir um die Sattelhöhe minus etwas (damit es so aussieht, als säße er drauf).
      this.player.mesh.position.y += 1.1;
    }

    // Power-Up aufsammeln
    const pickup = this.powerups.checkPickup(this.player.hitbox);
    if (pickup && pickup.kind === 'horse') {
      this.mount();
    }

    // Kollision mit Hindernissen - nur wenn nicht mounted
    if (!isMounted) {
      const hit = this.obstacles.checkCollision(this.player.hitbox);
      if (hit) {
        this.endRun();
      }
    }

    // Kamera nachführen
    const target = this.player.mesh.position;
    const camTargetX = target.x * 0.3;
    this.camera.position.x += (camTargetX - this.camera.position.x) * 0.1;
    this.camera.position.z = target.z + 7;
    this.camera.lookAt(camTargetX, 1.2, target.z - 6);
  }

  /** Aufspringen oder Timer verlängern. */
  private mount() {
    const wasMounted = this.mountedT > 0;
    this.mountedT += this.mountDuration;
    if (!wasMounted) {
      this.mountVisual.visible = true;
      this.powerups.pauseSpawning(true);
    }
  }

  private dismount() {
    this.mountVisual.visible = false;
    this.powerups.pauseSpawning(false);
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.renderer.dispose();
  }
}

// markiere unbenutzten Import-Aliasen weg, damit strict TS nicht meckert
void WORLD;
