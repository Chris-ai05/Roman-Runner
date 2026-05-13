import * as THREE from 'three';
import { COLORS, SPEED, WORLD } from './constants';
import { Input } from './input';
import { Player } from './player';
import { World } from './world';
import { Obstacles } from './obstacles';
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

  private state: State = 'menu';
  private speed = SPEED.start;
  private distance = 0;
  private coins = 0;
  private runTime = 0;

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

    this.positionCamera();
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

    // Spieler bewegt sich nach vorn (negatives Z)
    this.player.mesh.position.z -= this.speed * dt;
    this.distance += this.speed * dt;
    this.ui.setDistance(this.distance);

    // Eingabe verarbeiten
    let action;
    while ((action = this.input.consume())) {
      this.player.handle(action);
    }

    this.player.update(dt, this.runTime);
    this.world.update(this.player.mesh.position.z);
    this.obstacles.update(dt, this.player.mesh.position.z, this.speed);

    // Kollision
    const hit = this.obstacles.checkCollision(this.player.hitbox);
    if (hit) {
      this.endRun();
    }

    // Kamera nachführen
    const target = this.player.mesh.position;
    const camTargetX = target.x * 0.3;
    this.camera.position.x += (camTargetX - this.camera.position.x) * 0.1;
    this.camera.position.z = target.z + 7;
    this.camera.lookAt(camTargetX, 1.2, target.z - 6);
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
