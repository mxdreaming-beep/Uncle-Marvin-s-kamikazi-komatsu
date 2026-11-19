import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DozerAudio } from './audio';
import { createKomatsuD355A, type DozerRig } from './dozerModel';
import { createGranbyWorld, type BuildingInstance, type GranbyWorld } from './granbyWorld';
import { ParticleSystem } from './particles';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import type {
  CameraMode,
  DestructionEvent,
  GameMode,
  GamePhase,
  HudSnapshot,
  HullStyle,
  InputState,
} from './types';

const BEST_SCORE_KEY = 'uncle_marvin_komatsu_best_v1';
const MISSION_TIME_LIMIT = 240; // 4 minutes

// Pre-allocated math helpers outside render loop (zero GC)
const _camDesiredPos = new THREE.Vector3();
const _camDesiredLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3();
const _exhaustWorld = new THREE.Vector3();
const _shakeOffset = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GranbyEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onContextLost: (lost: boolean) => void;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;

  private textures: ProceduralTextureSet;
  private dozer: DozerRig;
  private world: GranbyWorld;
  private particles: ParticleSystem;
  private audio: DozerAudio;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Game State
  private phase: GamePhase = 'title';
  private mode: GameMode = 'mission';
  private cameraMode: CameraMode = 'chase';
  private hullStyle: HullStyle = 'armored';

  private damageDollars = 0;
  private bestScore = 0;
  private timeRemaining = MISSION_TIME_LIMIT;
  private elapsedTime = 0;
  private combo = 0;
  private comboTimer = 0;
  private peakCombo = 1;
  private eventSeq = 0;
  private latestEvent: DestructionEvent | null = null;
  private latestEventAge = 0;

  // Bulldozer Kinematics
  private dozerX = -4;
  private dozerZ = 0;
  private dozerHeading = Math.PI * 0.5; // Facing West/East along Agate Ave (facing East = -PI/2, West = +PI/2)
  private dozerSpeed = 0;
  private dozerTurnRate = 0;
  private engineTemp = 18;
  private overheated = false;
  private ramAmount = 0;
  private treadAccum = 0;
  private exhaustTimer = 0;
  private steamTimer = 0;

  // Camera & Juice
  private camShake = 0;
  private hitstopTimer = 0;
  private titleOrbitAngle = 0.72;
  private hudEmitAccum = 0;

  // Live Input State
  private keyInput: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    ram: false,
  };
  private touchInput: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    ram: false,
  };

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onContextLost: (lost: boolean) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLost = onContextLost;

    try {
      const saved = window.localStorage.getItem(BEST_SCORE_KEY);
      if (saved) this.bestScore = Number(saved) || 0;
    } catch {
      this.bestScore = 0;
    }

    this.isSoftwareGl = detectSoftwareGl();

    // 1. Renderer setup (Modern PBR + ACES Filmic + Software-WebGL Guard)
    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    // Context lost/restored safety
    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    // 2. Scene, Sky & Horizon Fog (Crisp High-Altitude Colorado Sky)
    const scene = new THREE.Scene();
    const skyColor = 0xb6cde0;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, 115, 255);
    this.scene = scene;

    // Mandatory Procedural Studio IBL Environment Map on all devices
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(52, aspect, 0.4, 420);
    camera.position.set(-18, 9, 14);
    this.camera = camera;

    // 4. 3-Point Warm/Cool Alpine Daylight Rig
    const hemiLight = new THREE.HemisphereLight(0x9bc5e8, 0x7c6850, 0.78);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d2, 2.25);
    sunLight.position.set(55, 72, 42);
    sunLight.castShadow = !this.isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 190;
    const d = 58;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.03;
    scene.add(sunLight);
    scene.add(sunLight.target);
    this.sunLight = sunLight;

    const rimLight = new THREE.DirectionalLight(0xc8def4, 0.55);
    rimLight.position.set(-60, 35, -55);
    scene.add(rimLight);

    // 5. Procedural Assets, World, Hero Komatsu D355A & Particle System
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.world = createGranbyWorld(scene, this.textures);
    this.dozer = createKomatsuD355A(this.textures);
    this.dozer.setHullStyle(this.hullStyle);
    scene.add(this.dozer.root);

    this.particles = new ParticleSystem(scene);
    this.audio = new DozerAudio();

    this.placeDozerAtStart();
    _camCurrentLook.set(this.dozerX, 2.2, this.dozerZ);

    // Pre-warm shaders on real GPU
    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.emitHud();
    this.clock.start();
    this.tick();
  }

  private placeDozerAtStart() {
    this.dozerX = -16;
    this.dozerZ = 0;
    this.dozerHeading = -Math.PI * 0.5; // Facing East straight down Agate Avenue
    this.dozerSpeed = 0;
    this.dozerTurnRate = 0;
    this.engineTemp = 20;
    this.overheated = false;
    this.ramAmount = 0;
    this.dozer.root.position.set(this.dozerX, 0, this.dozerZ);
    this.dozer.root.rotation.set(0, this.dozerHeading, 0);
  }

  public startGame(mode: GameMode) {
    this.audio.unlock();
    this.mode = mode;
    this.phase = 'playing';
    this.damageDollars = 0;
    this.timeRemaining = MISSION_TIME_LIMIT;
    this.elapsedTime = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.peakCombo = 1;
    this.latestEvent = null;
    this.latestEventAge = 0;
    this.camShake = 0;
    this.hitstopTimer = 0;

    this.world.resetWorld();
    this.particles.reset();
    this.placeDozerAtStart();

    // Snap camera behind bulldozer smoothly on start
    const fwdX = -Math.sin(this.dozerHeading);
    const fwdZ = -Math.cos(this.dozerHeading);
    this.camera.position.set(this.dozerX - fwdX * 16, 9.5, this.dozerZ - fwdZ * 16);
    _camCurrentLook.set(this.dozerX + fwdX * 5, 2.2, this.dozerZ + fwdZ * 5);

    this.audio.playHorn();
    this.emitHud();
  }

  public returnToTitle() {
    this.phase = 'title';
    this.world.resetWorld();
    this.particles.reset();
    this.placeDozerAtStart();
    this.audio.updateEngine(0, false, false, false);
    this.emitHud();
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public cycleCameraMode(): CameraMode {
    const order: CameraMode[] = ['chase', 'aerial', 'low', 'cab'];
    const next = order[(order.indexOf(this.cameraMode) + 1) % order.length];
    this.cameraMode = next;
    return next;
  }

  public setHullStyle(style: HullStyle) {
    this.hullStyle = style;
    this.dozer.setHullStyle(style);
  }

  public setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  public honkHorn() {
    this.audio.playHorn();
  }

  public setTouchControl(control: keyof InputState, pressed: boolean) {
    this.audio.unlock();
    this.touchInput[control] = pressed;
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextLost(true);
  };

  private handleContextRestored = () => {
    this.onContextLost(false);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (this.phase === 'playing') {
      this.audio.unlock();
    }
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyInput.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyInput.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keyInput.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keyInput.right = true;
        break;
      case 'Space':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyInput.ram = true;
        break;
      case 'KeyF':
      case 'KeyE':
        if (this.phase === 'playing') this.audio.playHorn();
        break;
      case 'KeyR':
        if (this.phase === 'playing') this.startGame(this.mode);
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyInput.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyInput.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keyInput.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keyInput.right = false;
        break;
      case 'Space':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyInput.ram = false;
        break;
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const totalTime = this.clock.elapsedTime;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.particles.update(dt * 0.25);
      this.updateCamera(dt, totalTime);
    } else {
      this.stepSimulation(dt, totalTime);
    }

    // Keep shadow frustum tight around bulldozer
    if (!this.isSoftwareGl) {
      this.sunLight.position.set(this.dozerX + 55, 72, this.dozerZ + 42);
      this.sunLight.target.position.set(this.dozerX, 0, this.dozerZ);
    }

    this.renderer.render(this.scene, this.camera);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private stepSimulation(dt: number, totalTime: number) {
    const isPlaying = this.phase === 'playing';
    const fwdInput = isPlaying && (this.keyInput.forward || this.touchInput.forward);
    const revInput = isPlaying && (this.keyInput.backward || this.touchInput.backward);
    const leftInput = isPlaying && (this.keyInput.left || this.touchInput.left);
    const rightInput = isPlaying && (this.keyInput.right || this.touchInput.right);
    const wantRam = isPlaying && (this.keyInput.ram || this.touchInput.ram);

    // 1. Timers & Combo decay
    if (isPlaying) {
      this.elapsedTime += dt;
      if (this.mode === 'mission') {
        this.timeRemaining = Math.max(0, this.timeRemaining - dt);
        if (this.timeRemaining <= 0) {
          this.phase = 'gameover';
          this.saveBestScore();
          this.audio.updateEngine(0, false, false, false);
          this.emitHud();
        }
      }
      if (this.comboTimer > 0) {
        this.comboTimer = Math.max(0, this.comboTimer - dt);
        if (this.comboTimer <= 0) {
          this.combo = 0;
        }
      }
      if (this.latestEvent) {
        this.latestEventAge += dt;
        if (this.latestEventAge > 3.6) {
          this.latestEvent = null;
        }
      }
    }

    // 2. Engine Radiator Heat & Turbo Ram Logic
    const isRamming = wantRam && !this.overheated;
    if (isPlaying) {
      if (isRamming) {
        this.engineTemp = Math.min(100, this.engineTemp + dt * 21);
        if (this.engineTemp >= 100) {
          this.overheated = true;
          this.audio.playSteamHiss();
        }
      } else {
        const coolRate = this.overheated ? 20 : 12;
        this.engineTemp = Math.max(18, this.engineTemp - dt * coolRate);
        if (this.overheated && this.engineTemp <= 42) {
          this.overheated = false;
        }
      }
    }

    const ramTarget = isRamming ? 1 : 0;
    this.ramAmount += (ramTarget - this.ramAmount) * (1 - Math.exp(-10 * dt));

    // 3. Heavy Tracked Komatsu D355A Physics
    if (isPlaying) {
      const steerDir = (leftInput ? 1 : 0) - (rightInput ? 1 : 0);
      const maxTurnRate = isRamming ? 1.35 : 1.75;
      const targetTurn = steerDir * maxTurnRate;
      this.dozerTurnRate += (targetTurn - this.dozerTurnRate) * (1 - Math.exp(-9 * dt));
      this.dozerHeading += this.dozerTurnRate * dt;

      const throttle = (fwdInput ? 1 : 0) - (revInput ? 0.65 : 0);
      const maxSpeed = this.overheated ? 8.5 : isRamming ? 25.5 : 16.5;
      const accel = isRamming ? 32 : 18;

      if (throttle !== 0) {
        this.dozerSpeed += throttle * accel * dt;
      } else {
        // Heavy tracked rolling resistance
        const drag = Math.exp(-5.2 * dt);
        this.dozerSpeed *= drag;
        if (Math.abs(this.dozerSpeed) < 0.08) this.dozerSpeed = 0;
      }
      this.dozerSpeed = THREE.MathUtils.clamp(this.dozerSpeed, -10.5, maxSpeed);

      const fwdX = -Math.sin(this.dozerHeading);
      const fwdZ = -Math.cos(this.dozerHeading);

      this.dozerX += fwdX * this.dozerSpeed * dt;
      this.dozerZ += fwdZ * this.dozerSpeed * dt;

      // Soft natural valley perimeter clamp (keep player within Granby pine forest ring)
      const limit = this.world.playBounds;
      if (this.dozerX < -limit) {
        this.dozerX = -limit;
        this.dozerSpeed *= 0.4;
      } else if (this.dozerX > limit) {
        this.dozerX = limit;
        this.dozerSpeed *= 0.4;
      }
      if (this.dozerZ < -limit) {
        this.dozerZ = -limit;
        this.dozerSpeed *= 0.4;
      } else if (this.dozerZ > limit) {
        this.dozerZ = limit;
        this.dozerSpeed *= 0.4;
      }

      // Stamp persistent dirt/rubber tread tracks
      this.treadAccum += Math.abs(this.dozerSpeed) * dt + Math.abs(this.dozerTurnRate) * 0.6 * dt;
      if (this.treadAccum >= 1.25) {
        this.treadAccum = 0;
        this.particles.stampTreadPair(this.dozerX, this.dozerZ, this.dozerHeading);
      }

      // Building collisions & demolition
      this.resolveBuildingCollisions(dt, fwdX, fwdZ, isRamming);

      // Town prop smashing (vehicles, lamps, hydrants, fences)
      this.resolvePropCollisions(dt, fwdX, fwdZ);

      // Diesel exhaust smoke from twin vertical stacks
      this.exhaustTimer += dt;
      const exhaustInterval = isRamming ? 0.045 : Math.abs(this.dozerSpeed) > 1 ? 0.08 : 0.17;
      if (this.exhaustTimer >= exhaustInterval) {
        this.exhaustTimer = 0;
        const smokeHex = isRamming ? 0x26292e : 0x454a50;
        for (const stackObj of [this.dozer.exhaustLeftPos, this.dozer.exhaustRightPos]) {
          stackObj.getWorldPosition(_exhaustWorld);
          this.particles.spawnPuff(
            _exhaustWorld.x,
            _exhaustWorld.y,
            _exhaustWorld.z,
            (Math.random() - 0.5) * 1.4 - fwdX * 1.2,
            2.4 + Math.random() * 1.8,
            (Math.random() - 0.5) * 1.4 - fwdZ * 1.2,
            isRamming ? 0.45 : 0.28,
            0.95,
            0.75 + Math.random() * 0.45,
            smokeHex
          );
        }
      }

      // Overheated radiator steam venting!
      if (this.overheated || this.engineTemp > 84) {
        this.steamTimer += dt;
        if (this.steamTimer >= 0.07) {
          this.steamTimer = 0;
          this.particles.spawnPuff(
            this.dozerX + fwdX * 2.1,
            2.6,
            this.dozerZ + fwdZ * 2.1,
            (Math.random() - 0.5) * 2.2,
            3.5 + Math.random() * 2.0,
            (Math.random() - 0.5) * 2.2,
            0.55,
            1.4,
            0.9,
            0xeef4f8
          );
        }
      }
    }

    // 4. Sync Dozer Transform & Animated Sub-Components
    this.dozer.root.position.set(this.dozerX, 0, this.dozerZ);
    this.dozer.root.rotation.set(0, this.dozerHeading, 0);
    this.dozer.updateVisuals(dt, this.dozerSpeed, this.dozerTurnRate, this.ramAmount, totalTime);

    // 5. Update Audio Synth
    this.audio.updateEngine(
      Math.min(1, Math.abs(this.dozerSpeed) / 18),
      Math.abs(this.dozerTurnRate) > 0.2,
      isRamming,
      isPlaying
    );

    // 6. Animate collapsing buildings & flying smashed props
    this.updateBuildingsAnimation(dt, totalTime);
    this.updateFlyingProps(dt);
    this.particles.update(dt);

    // 7. Update Camera
    this.updateCamera(dt, totalTime);
  }

  private resolveBuildingCollisions(dt: number, fwdX: number, fwdZ: number, isRamming: boolean) {
    // Blade tip & bulldozer hull collision center
    const bladeX = this.dozerX + fwdX * 2.85;
    const bladeZ = this.dozerZ + fwdZ * 2.85;
    const dozerRadius = 2.6;

    for (const b of this.world.buildings) {
      if (b.hitCooldown > 0) b.hitCooldown -= dt;
      if (b.destroyed) continue;

      const halfW = b.w * 0.5;
      const halfD = b.d * 0.5;

      // Closest point on building AABB to bulldozer center
      const closestX = THREE.MathUtils.clamp(this.dozerX, b.x - halfW, b.x + halfW);
      const closestZ = THREE.MathUtils.clamp(this.dozerZ, b.z - halfD, b.z + halfD);
      const dx = this.dozerX - closestX;
      const dz = this.dozerZ - closestZ;
      const distSq = dx * dx + dz * dz;

      // Also check front blade contact
      const bCloseX = THREE.MathUtils.clamp(bladeX, b.x - halfW, b.x + halfW);
      const bCloseZ = THREE.MathUtils.clamp(bladeZ, b.z - halfD, b.z + halfD);
      const bdx = bladeX - bCloseX;
      const bdz = bladeZ - bCloseZ;
      const bladeHit = bdx * bdx + bdz * bdz < 2.25 * 2.25;

      if (distSq < dozerRadius * dozerRadius || bladeHit) {
        const impactSpeed = Math.abs(this.dozerSpeed);

        // Deal demolition damage on contact!
        if (b.hitCooldown <= 0 && (impactSpeed > 1.2 || isRamming)) {
          const ramMult = isRamming ? 2.15 : 1.0;
          const dmg = (16 + impactSpeed * 2.35) * ramMult;
          this.damageBuilding(b, dmg, bCloseX, bCloseZ, fwdX, fwdZ, impactSpeed);
          b.hitCooldown = isRamming ? 0.15 : 0.22;
        }

        // Push bulldozer cleanly out of standing wall so it feels solid until it crumbles
        if (!b.destroyed && distSq < dozerRadius * dozerRadius) {
          let nx = dx;
          let nz = dz;
          const dist = Math.sqrt(distSq);
          if (dist > 0.001) {
            nx /= dist;
            nz /= dist;
            const overlap = dozerRadius - dist;
            this.dozerX += nx * overlap;
            this.dozerZ += nz * overlap;
          } else {
            // Inside box fallback: eject along shallowest axis
            const penX = halfW + dozerRadius - Math.abs(this.dozerX - b.x);
            const penZ = halfD + dozerRadius - Math.abs(this.dozerZ - b.z);
            if (penX < penZ) {
              this.dozerX += this.dozerX >= b.x ? penX : -penX;
            } else {
              this.dozerZ += this.dozerZ >= b.z ? penZ : -penZ;
            }
          }
          // Heavy grinding resistance against concrete wall
          this.dozerSpeed *= isRamming ? 0.48 : 0.32;
        }
      }
    }
  }

  private damageBuilding(
    b: BuildingInstance,
    damage: number,
    hitX: number,
    hitZ: number,
    fwdX: number,
    fwdZ: number,
    impactSpeed: number
  ) {
    if (b.destroyed) return;

    b.hp = Math.max(0, b.hp - damage);
    this.engineTemp = Math.min(100, this.engineTemp + 3.2);

    // Visibly rock/tilt structure away from impact
    b.tiltX = THREE.MathUtils.clamp(b.tiltX + fwdZ * 0.045, -0.18, 0.18);
    b.tiltZ = THREE.MathUtils.clamp(b.tiltZ - fwdX * 0.045, -0.18, 0.18);

    // Small incremental property damage score
    const chipDollars = Math.round((damage / b.maxHp) * b.value * 0.25);
    this.damageDollars += chipDollars;

    // Debris & dust burst at point of blade impact
    this.particles.spawnDebrisBurst(
      hitX,
      2.2,
      hitZ,
      14,
      b.palette,
      fwdX * (5 + impactSpeed * 0.5),
      fwdZ * (5 + impactSpeed * 0.5),
      8.5
    );
    this.particles.spawnDustCloud(hitX, 2.0, hitZ, 7, 0xc9bca6, 1.0);

    this.camShake = Math.min(1.0, this.camShake + 0.28 + impactSpeed * 0.014);
    this.audio.playImpact(0.5 + impactSpeed * 0.03);

    if (b.hp <= 0) {
      this.collapseBuilding(b, fwdX, fwdZ);
    }
  }

  private collapseBuilding(b: BuildingInstance, fwdX: number, fwdZ: number) {
    if (b.destroyed) return;
    b.destroyed = true;
    b.hp = 0;
    b.beaconRing.visible = false;
    b.rubbleGroup.visible = true;

    // Combo multiplier
    this.combo = Math.min(5, this.combo + 1);
    this.comboTimer = 9.0;
    if (this.combo > this.peakCombo) this.peakCombo = this.combo;

    const bonusMult = 1 + (this.combo - 1) * 0.25;
    const reward = Math.round(b.value * bonusMult);
    this.damageDollars += reward;
    this.saveBestScore();

    let note: string | undefined;

    // Massive collapse debris + dust cloud
    this.particles.spawnDebrisBurst(b.x, b.h * 0.42, b.z, 42, b.palette, fwdX * 6, fwdZ * 6, 14);
    this.particles.spawnDustCloud(b.x, 3.0, b.z, 22, 0xc8baa2, 1.9);

    if (b.isExplosive) {
      // Agate Propane Depot chain-reaction fireball & shockwave!
      note = 'Propane Chain Blast!';
      this.particles.spawnDustCloud(b.x, 4.5, b.z, 18, 0xff6b24, 2.2);
      this.particles.spawnDustCloud(b.x, 7.5, b.z, 14, 0x2c2e33, 2.4);
      this.audio.playCollapse(true);
      this.camShake = 1.45;
      this.hitstopTimer = 0.065;

      // Damage nearby structures within 38 units
      for (const other of this.world.buildings) {
        if (other.id === b.id || other.destroyed) continue;
        const dist = Math.hypot(other.x - b.x, other.z - b.z);
        if (dist < 42) {
          this.damageBuilding(other, 65, other.x, other.z, (other.x - b.x) / dist, (other.z - b.z) / dist, 15);
        }
      }
    } else if (b.isCooling) {
      // Water Tower deluge instantly cools Komatsu radiator!
      note = 'Water Deluge · Radiator Cooled!';
      this.engineTemp = 15;
      this.overheated = false;
      this.particles.spawnDustCloud(b.x, 6.0, b.z, 24, 0x7dd3fc, 2.1);
      this.audio.playCollapse(false);
      this.audio.playSteamHiss();
      this.camShake = 1.15;
      this.hitstopTimer = 0.05;
    } else {
      this.audio.playCollapse(false);
      this.camShake = Math.max(this.camShake, 0.95);
      this.hitstopTimer = 0.045;
    }

    this.eventSeq += 1;
    this.latestEvent = {
      id: this.eventSeq,
      buildingName: b.name,
      reward,
      combo: this.combo,
      note,
    };
    this.latestEventAge = 0;

    // Check mission completion
    const standing = this.world.buildings.filter((item) => !item.destroyed).length;
    if (standing === 0 && this.mode === 'mission') {
      // Time bonus for fast completion
      const timeBonus = Math.round(this.timeRemaining * 1500);
      this.damageDollars += timeBonus;
      this.saveBestScore();
      this.phase = 'victory';
      this.audio.updateEngine(0, false, false, false);
    }

    this.emitHud();
  }

  private resolvePropCollisions(_dt: number, fwdX: number, fwdZ: number) {
    for (const p of this.world.props) {
      if (p.destroyed) continue;
      const dx = p.x - this.dozerX;
      const dz = p.z - this.dozerZ;
      const hitDist = p.radius + 2.85;
      if (dx * dx + dz * dz < hitDist * hitDist) {
        p.destroyed = true;
        const speedBoost = Math.max(10, Math.abs(this.dozerSpeed) * 1.45);
        const dirLen = Math.hypot(dx, dz) || 1;
        p.vx = (dx / dirLen) * speedBoost + fwdX * 6;
        p.vy = p.kind === 'vehicle' ? 7.5 : 10.5;
        p.vz = (dz / dirLen) * speedBoost + fwdZ * 6;
        p.vrx = (Math.random() - 0.5) * 8;
        p.vrz = (Math.random() - 0.5) * 8;

        this.damageDollars += p.value;
        this.saveBestScore();
        this.camShake = Math.max(this.camShake, p.kind === 'vehicle' ? 0.35 : 0.16);
        this.audio.playImpact(p.kind === 'vehicle' ? 0.65 : 0.35);

        if (p.kind === 'hydrant') {
          // Geyser spray cools radiator!
          this.engineTemp = Math.max(18, this.engineTemp - 38);
          this.overheated = false;
          this.audio.playSteamHiss();
          this.particles.spawnDustCloud(p.x, 1.8, p.z, 12, 0x7dd3fc, 1.15);
        } else if (p.kind === 'vehicle') {
          this.particles.spawnDebrisBurst(p.x, 1.4, p.z, 10, [0x2a4d69, 0x3b424a, 0xd4a238], fwdX * 7, fwdZ * 7, 7);
          this.particles.spawnDustCloud(p.x, 1.2, p.z, 6, 0xb8afa0, 0.9);
        } else {
          this.particles.spawnDebrisBurst(p.x, 1.2, p.z, 6, [0x9c7853, 0x454b52], fwdX * 5, fwdZ * 5, 6);
        }
      }
    }
  }

  private updateBuildingsAnimation(dt: number, totalTime: number) {
    for (const b of this.world.buildings) {
      if (!b.destroyed) {
        // Gentle structural stress tilt when damaged
        const damageRatio = 1 - b.hp / b.maxHp;
        const shakeAmt = b.hitCooldown > 0.08 ? 0.06 : 0;
        b.structureGroup.rotation.x = b.tiltX * (0.4 + damageRatio) + Math.sin(totalTime * 55) * shakeAmt;
        b.structureGroup.rotation.z = b.tiltZ * (0.4 + damageRatio) + Math.cos(totalTime * 51) * shakeAmt;
        b.structureGroup.position.y = -damageRatio * 0.65;

        // Subtle pulse opacity on beacon perimeter ring
        const mat = b.beaconRing.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.28 + Math.sin(totalTime * 2.4) * 0.14;
      } else if (b.collapseProgress < 1) {
        b.collapseProgress = Math.min(1, b.collapseProgress + dt * 0.85);
        const t = b.collapseProgress;
        const ease = t * t;

        b.structureGroup.position.y = -ease * (b.h + 1.5);
        b.structureGroup.rotation.x += dt * (b.tiltX >= 0 ? 0.5 : -0.5);
        b.structureGroup.rotation.z += dt * (b.tiltZ >= 0 ? 0.5 : -0.5);
        b.structureGroup.scale.y = Math.max(0.15, 1 - ease * 0.82);

        // Rubble pile swells up cleanly as building sinks
        b.rubbleGroup.scale.set(1, Math.min(1, 0.15 + t * 1.15), 1);

        if (b.collapseProgress >= 1) {
          b.structureGroup.visible = false;
        }
      }
    }
  }

  private updateFlyingProps(dt: number) {
    for (const p of this.world.props) {
      if (!p.destroyed || p.flyTime > 4.5) continue;
      p.flyTime += dt;
      p.vy -= 22 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.vrx * dt;
      p.mesh.rotation.z += p.vrz * dt;

      if (p.mesh.position.y < 0.45) {
        p.mesh.position.y = 0.45;
        p.vy = -p.vy * 0.32;
        p.vx *= 0.65;
        p.vz *= 0.65;
        p.vrx *= 0.55;
        p.vrz *= 0.55;
      }
    }
  }

  private updateCamera(dt: number, totalTime: number) {
    if (this.phase === 'title') {
      // Cinematic slow orbit around the Komatsu D355A on Agate Avenue
      this.titleOrbitAngle += dt * 0.16;
      const radius = 16.5;
      _camDesiredPos.set(
        this.dozerX + Math.cos(this.titleOrbitAngle) * radius,
        6.4 + Math.sin(totalTime * 0.4) * 0.6,
        this.dozerZ + Math.sin(this.titleOrbitAngle) * radius
      );
      _camDesiredLook.set(this.dozerX, 2.2, this.dozerZ);

      const damp = 1 - Math.exp(-3.5 * dt);
      this.camera.position.lerp(_camDesiredPos, damp);
      _camCurrentLook.lerp(_camDesiredLook, damp);
      this.camera.lookAt(_camCurrentLook);
      return;
    }

    const fwdX = -Math.sin(this.dozerHeading);
    const fwdZ = -Math.cos(this.dozerHeading);

    // Dynamic FOV widening during Turbo Ram
    const targetFov = this.cameraMode === 'cab' ? 66 : 52 + this.ramAmount * 8;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'chase') {
      _camDesiredPos.set(this.dozerX - fwdX * 15.5, 8.6, this.dozerZ - fwdZ * 15.5);
      _camDesiredLook.set(this.dozerX + fwdX * 6.5, 2.4, this.dozerZ + fwdZ * 6.5);
    } else if (this.cameraMode === 'aerial') {
      _camDesiredPos.set(this.dozerX - fwdX * 19, 34, this.dozerZ - fwdZ * 19);
      _camDesiredLook.set(this.dozerX + fwdX * 4, 1.0, this.dozerZ + fwdZ * 4);
    } else if (this.cameraMode === 'low') {
      // Dramatic low hero chase angle emphasizing massive Semi-U blade
      const rightX = Math.cos(this.dozerHeading);
      const rightZ = -Math.sin(this.dozerHeading);
      _camDesiredPos.set(
        this.dozerX - fwdX * 11.2 + rightX * 3.8,
        3.8,
        this.dozerZ - fwdZ * 11.2 + rightZ * 3.8
      );
      _camDesiredLook.set(this.dozerX + fwdX * 7.5, 2.6, this.dozerZ + fwdZ * 7.5);
    } else {
      // Cab / Hood first-person armored visor view
      _camDesiredPos.set(this.dozerX + fwdX * 0.4, 3.65, this.dozerZ + fwdZ * 0.4);
      _camDesiredLook.set(this.dozerX + fwdX * 18, 2.1, this.dozerZ + fwdZ * 18);
    }

    const posLambda = this.cameraMode === 'cab' ? 18 : 6.2;
    const lookLambda = this.cameraMode === 'cab' ? 20 : 8.5;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesiredPos.x, posLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesiredPos.y, posLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesiredPos.z, posLambda, dt);

    _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camDesiredLook.x, lookLambda, dt);
    _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camDesiredLook.y, lookLambda, dt);
    _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camDesiredLook.z, lookLambda, dt);

    // Decay & apply impact camera shake
    if (this.camShake > 0.005) {
      this.camShake = Math.max(0, this.camShake - dt * 2.6);
      const mag = this.camShake * 0.65;
      _shakeOffset.set(
        (Math.random() - 0.5) * mag,
        (Math.random() - 0.5) * mag * 0.7,
        (Math.random() - 0.5) * mag
      );
      this.camera.position.add(_shakeOffset);
    }

    this.camera.lookAt(_camCurrentLook);
  }

  private saveBestScore() {
    if (this.damageDollars > this.bestScore) {
      this.bestScore = this.damageDollars;
      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
      } catch {
        // ignore storage errors
      }
    }
  }

  private emitHud() {
    let destroyedCount = 0;
    let nearestName: string | null = null;
    let nearestDist = Infinity;

    const blips = this.world.buildings.map((b) => {
      if (b.destroyed) {
        destroyedCount += 1;
      } else {
        const dist = Math.hypot(b.x - this.dozerX, b.z - this.dozerZ);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestName = b.name;
        }
      }
      return {
        id: b.id,
        name: b.name,
        x: b.x,
        z: b.z,
        w: b.w,
        d: b.d,
        destroyed: b.destroyed,
        hpRatio: b.hp / b.maxHp,
        isCooling: b.isCooling,
        isExplosive: b.isExplosive,
      };
    });

    this.onHudUpdate({
      phase: this.phase,
      mode: this.mode,
      damageDollars: this.damageDollars,
      bestScore: this.bestScore,
      destroyedCount,
      totalBuildings: this.world.buildings.length,
      timeRemaining: this.timeRemaining,
      elapsedTime: this.elapsedTime,
      speedMph: Math.round(Math.abs(this.dozerSpeed) * 1.45),
      engineTemp: Math.round(this.engineTemp),
      overheated: this.overheated,
      ramming: this.ramAmount > 0.25,
      combo: this.combo,
      comboTimer: this.comboTimer / 9.0,
      peakCombo: this.peakCombo,
      nearestTargetName: nearestName,
      nearestTargetDist: Number.isFinite(nearestDist) ? Math.round(nearestDist * 3.2) : 0,
      dozerX: this.dozerX,
      dozerZ: this.dozerZ,
      dozerHeading: this.dozerHeading,
      blips,
      latestEvent: this.latestEvent,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.audio.dispose();
    this.particles.dispose();
    this.dozer.dispose();
    this.world.dispose();
    this.textures.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
