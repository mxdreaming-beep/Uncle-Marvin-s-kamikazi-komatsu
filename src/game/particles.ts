import * as THREE from 'three';

interface DebrisItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  sx: number;
  sy: number;
  sz: number;
  life: number;
  maxLife: number;
}

interface PuffItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  grow: number;
  life: number;
  maxLife: number;
}

const MAX_DEBRIS = 420;
const MAX_PUFFS = 240;
const MAX_TREADS = 220;

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class ParticleSystem {
  private debrisMesh: THREE.InstancedMesh;
  private puffMesh: THREE.InstancedMesh;
  private treadMesh: THREE.InstancedMesh;

  private debris: DebrisItem[] = [];
  private puffs: PuffItem[] = [];
  private debrisCursor = 0;
  private puffCursor = 0;
  private treadCursor = 0;

  private debrisGeo: THREE.BoxGeometry;
  private debrisMat: THREE.MeshStandardMaterial;
  private puffGeo: THREE.DodecahedronGeometry;
  private puffMat: THREE.MeshStandardMaterial;
  private treadGeo: THREE.PlaneGeometry;
  private treadMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    // 1. 3D Physics Debris Chunks (bricks, timber planks, concrete blocks, sheet steel)
    this.debrisGeo = new THREE.BoxGeometry(1, 1, 1);
    this.debrisMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.12,
    });
    this.debrisMesh = new THREE.InstancedMesh(this.debrisGeo, this.debrisMat, MAX_DEBRIS);
    this.debrisMesh.castShadow = false;
    this.debrisMesh.receiveShadow = true;
    this.debrisMesh.frustumCulled = false;

    for (let i = 0; i < MAX_DEBRIS; i++) {
      this.debris.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        vrx: 0,
        vry: 0,
        vrz: 0,
        sx: 0,
        sy: 0,
        sz: 0,
        life: 0,
        maxLife: 1,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, _dummy.matrix);
      this.debrisMesh.setColorAt(i, _color.setHex(0x888888));
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;
    if (this.debrisMesh.instanceColor) this.debrisMesh.instanceColor.needsUpdate = true;
    scene.add(this.debrisMesh);

    // 2. Dust / Exhaust / Smoke / Water / Fire Puffs
    this.puffGeo = new THREE.DodecahedronGeometry(0.65, 1);
    this.puffMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.puffMesh = new THREE.InstancedMesh(this.puffGeo, this.puffMat, MAX_PUFFS);
    this.puffMesh.frustumCulled = false;

    for (let i = 0; i < MAX_PUFFS; i++) {
      this.puffs.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0,
        grow: 1,
        life: 0,
        maxLife: 1,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.puffMesh.setMatrixAt(i, _dummy.matrix);
      this.puffMesh.setColorAt(i, _color.setHex(0xc8beae));
    }
    this.puffMesh.instanceMatrix.needsUpdate = true;
    if (this.puffMesh.instanceColor) this.puffMesh.instanceColor.needsUpdate = true;
    scene.add(this.puffMesh);

    // 3. Persistent Bulldozer Track Tread Marks on Ground
    this.treadGeo = new THREE.PlaneGeometry(0.95, 1.35);
    this.treadGeo.rotateX(-Math.PI / 2);
    this.treadMat = new THREE.MeshBasicMaterial({
      color: 0x26221c,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.treadMesh = new THREE.InstancedMesh(this.treadGeo, this.treadMat, MAX_TREADS);
    this.treadMesh.frustumCulled = false;
    for (let i = 0; i < MAX_TREADS; i++) {
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.treadMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.treadMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.treadMesh);
  }

  public spawnDebrisBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    palette: number[],
    impulseX = 0,
    impulseZ = 0,
    spread = 9
  ) {
    for (let i = 0; i < count; i++) {
      const idx = this.debrisCursor;
      this.debrisCursor = (this.debrisCursor + 1) % MAX_DEBRIS;
      const d = this.debris[idx];

      d.active = true;
      d.x = x + (Math.random() - 0.5) * 3.5;
      d.y = Math.max(0.5, y + Math.random() * 3.2);
      d.z = z + (Math.random() - 0.5) * 3.5;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * spread;
      d.vx = Math.cos(angle) * speed + impulseX * (0.4 + Math.random() * 0.7);
      d.vy = 4.5 + Math.random() * (spread * 0.95);
      d.vz = Math.sin(angle) * speed + impulseZ * (0.4 + Math.random() * 0.7);

      d.rx = Math.random() * Math.PI;
      d.ry = Math.random() * Math.PI;
      d.rz = Math.random() * Math.PI;
      d.vrx = (Math.random() - 0.5) * 9;
      d.vry = (Math.random() - 0.5) * 9;
      d.vrz = (Math.random() - 0.5) * 9;

      // Mix of chunky blocks and long wooden/steel beams
      if (Math.random() < 0.35) {
        d.sx = 0.28 + Math.random() * 0.25;
        d.sy = 0.24 + Math.random() * 0.22;
        d.sz = 1.4 + Math.random() * 1.4;
      } else {
        d.sx = 0.45 + Math.random() * 0.85;
        d.sy = 0.35 + Math.random() * 0.65;
        d.sz = 0.45 + Math.random() * 0.85;
      }

      d.life = 0;
      d.maxLife = 7 + Math.random() * 5;

      const hex = palette[Math.floor(Math.random() * palette.length)];
      this.debrisMesh.setColorAt(idx, _color.setHex(hex));
    }
    if (this.debrisMesh.instanceColor) this.debrisMesh.instanceColor.needsUpdate = true;
  }

  public spawnPuff(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    grow: number,
    maxLife: number,
    colorHex: number
  ) {
    const idx = this.puffCursor;
    this.puffCursor = (this.puffCursor + 1) % MAX_PUFFS;
    const p = this.puffs[idx];

    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.size = size;
    p.grow = grow;
    p.life = 0;
    p.maxLife = maxLife;

    this.puffMesh.setColorAt(idx, _color.setHex(colorHex));
    if (this.puffMesh.instanceColor) this.puffMesh.instanceColor.needsUpdate = true;
  }

  public spawnDustCloud(x: number, y: number, z: number, count: number, colorHex = 0xcbbda8, scale = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (1.5 + Math.random() * 4.5) * scale;
      this.spawnPuff(
        x + (Math.random() - 0.5) * 3.5 * scale,
        y + Math.random() * 2.2 * scale,
        z + (Math.random() - 0.5) * 3.5 * scale,
        Math.cos(a) * spd,
        (1.4 + Math.random() * 3.2) * scale,
        Math.sin(a) * spd,
        (0.9 + Math.random() * 1.1) * scale,
        2.1 * scale,
        1.1 + Math.random() * 1.1,
        colorHex
      );
    }
  }

  public stampTreadPair(x: number, z: number, heading: number) {
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const halfTrack = 1.62;

    for (const side of [-1, 1]) {
      const idx = this.treadCursor;
      this.treadCursor = (this.treadCursor + 1) % MAX_TREADS;
      const ox = cos * (side * halfTrack);
      const oz = -sin * (side * halfTrack);

      _dummy.position.set(x + ox, 0.045, z + oz);
      _dummy.rotation.set(0, heading, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.treadMesh.setMatrixAt(idx, _dummy.matrix);
    }
    this.treadMesh.instanceMatrix.needsUpdate = true;
  }

  public reset() {
    for (let i = 0; i < MAX_DEBRIS; i++) {
      this.debris[i].active = false;
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_PUFFS; i++) {
      this.puffs[i].active = false;
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.puffMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.puffMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_TREADS; i++) {
      _dummy.position.set(0, -50, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.treadMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.treadMesh.instanceMatrix.needsUpdate = true;
  }

  public update(dt: number) {
    let debrisDirty = false;
    for (let i = 0; i < MAX_DEBRIS; i++) {
      const d = this.debris[i];
      if (!d.active) continue;
      debrisDirty = true;

      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.debrisMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      d.vy -= 24 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;

      const floorY = d.sy * 0.5;
      if (d.y < floorY) {
        d.y = floorY;
        d.vy = -d.vy * 0.28;
        d.vx *= 0.68;
        d.vz *= 0.68;
        d.vrx *= 0.6;
        d.vry *= 0.6;
        d.vrz *= 0.6;
        if (Math.abs(d.vy) < 0.4) d.vy = 0;
      }

      d.rx += d.vrx * dt;
      d.ry += d.vry * dt;
      d.rz += d.vrz * dt;

      // Shrink gently in last 1.2s
      const fade = d.maxLife - d.life < 1.2 ? Math.max(0, (d.maxLife - d.life) / 1.2) : 1;

      _dummy.position.set(d.x, d.y, d.z);
      _dummy.rotation.set(d.rx, d.ry, d.rz);
      _dummy.scale.set(d.sx * fade, d.sy * fade, d.sz * fade);
      _dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (debrisDirty) this.debrisMesh.instanceMatrix.needsUpdate = true;

    let puffDirty = false;
    for (let i = 0; i < MAX_PUFFS; i++) {
      const p = this.puffs[i];
      if (!p.active) continue;
      puffDirty = true;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.puffMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      const t = p.life / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.96;
      p.vz *= 0.96;

      // Expand then taper cleanly
      const envelope = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
      const s = (p.size + t * p.grow) * envelope;

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(t * 1.4, t * 2.1, 0);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      this.puffMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (puffDirty) this.puffMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.debrisGeo.dispose();
    this.debrisMat.dispose();
    this.puffGeo.dispose();
    this.puffMat.dispose();
    this.treadGeo.dispose();
    this.treadMat.dispose();
  }
}
