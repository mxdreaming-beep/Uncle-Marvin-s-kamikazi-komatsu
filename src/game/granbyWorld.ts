import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';

export interface BuildingInstance {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  hp: number;
  maxHp: number;
  value: number;
  destroyed: boolean;
  collapseProgress: number; // 0 = standing, 1 = flattened
  tiltX: number;
  tiltZ: number;
  palette: number[];
  isExplosive?: boolean;
  isCooling?: boolean;
  hitCooldown: number;
  structureGroup: THREE.Group;
  rubbleGroup: THREE.Group;
  beaconRing: THREE.Mesh;
}

export interface DestructibleProp {
  id: string;
  kind: 'vehicle' | 'lamp' | 'hydrant' | 'propane' | 'fence';
  x: number;
  z: number;
  radius: number;
  destroyed: boolean;
  vx: number;
  vy: number;
  vz: number;
  vrx: number;
  vrz: number;
  flyTime: number;
  value: number;
  mesh: THREE.Object3D;
  origX: number;
  origY: number;
  origZ: number;
  origRotY: number;
}

export interface GranbyWorld {
  buildings: BuildingInstance[];
  props: DestructibleProp[];
  playBounds: number;
  resetWorld: () => void;
  dispose: () => void;
}

interface BuildingSpec {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  hp: number;
  value: number;
  style: 'townhall' | 'batchplant' | 'brick' | 'wood' | 'bank' | 'propane' | 'motel' | 'garage' | 'barn' | 'watertower' | 'lumber' | 'annex';
  signBg: string;
  signFg: string;
  signFace: 'south' | 'north';
  isExplosive?: boolean;
  isCooling?: boolean;
  palette: number[];
}

const BUILDING_SPECS: BuildingSpec[] = [
  // North side of Agate Avenue (z < -13)
  {
    id: 'town_hall',
    name: 'Granby Town Hall',
    subtitle: 'Civic Center · Est. 1905',
    x: -36,
    z: -24,
    w: 18,
    h: 10.5,
    d: 13,
    hp: 150,
    value: 175000,
    style: 'townhall',
    signBg: '#1e3348',
    signFg: '#f4ecd8',
    signFace: 'south',
    palette: [0x8b4232, 0xc9bca3, 0x3f454d, 0xdfd8cc],
  },
  {
    id: 'liberty_bank',
    name: 'Liberty Savings Bank',
    subtitle: 'First National · Granby',
    x: -10,
    z: -24,
    w: 16,
    h: 11,
    d: 13,
    hp: 165,
    value: 210000,
    style: 'bank',
    signBg: '#273a32',
    signFg: '#f3d479',
    signFace: 'south',
    palette: [0xc9bca3, 0x9b9180, 0x454c54, 0xd8cdb8],
  },
  {
    id: 'sky_hi_press',
    name: 'Sky-Hi News Press',
    subtitle: 'Grand County Weekly',
    x: 16,
    z: -23,
    w: 14,
    h: 8.2,
    d: 12,
    hp: 105,
    value: 115000,
    style: 'brick',
    signBg: '#5e231c',
    signFg: '#f7f1e3',
    signFace: 'south',
    palette: [0x8c4234, 0x6b3226, 0x434a52, 0x9c7853],
  },
  {
    id: 'general_store',
    name: 'Granby General Store',
    subtitle: 'Provisions & Mountain Cafe',
    x: 42,
    z: -23,
    w: 15,
    h: 7.8,
    d: 11.5,
    hp: 95,
    value: 98000,
    style: 'wood',
    signBg: '#4c321d',
    signFg: '#f6d06f',
    signFace: 'south',
    palette: [0x9c7853, 0x735234, 0x4e3723, 0xcbb694],
  },
  {
    id: 'concrete_plant',
    name: 'Mountain Concrete Plant',
    subtitle: 'Ready-Mix & Silos',
    x: -64,
    z: -28,
    w: 20,
    h: 12.5,
    d: 15,
    hp: 210,
    value: 265000,
    style: 'batchplant',
    signBg: '#2b3138',
    signFg: '#f5b82e',
    signFace: 'south',
    palette: [0x94989a, 0x78828c, 0x525a62, 0xb8b8b2],
  },
  {
    id: 'county_annex',
    name: 'Grand County Annex',
    subtitle: 'Zoning & Permits Dept.',
    x: 68,
    z: -25,
    w: 16,
    h: 9.8,
    d: 13,
    hp: 145,
    value: 160000,
    style: 'annex',
    signBg: '#24313f',
    signFg: '#e8edf2',
    signFace: 'south',
    palette: [0x8d4a3a, 0xc3b7a2, 0x464f57, 0xd1c8ba],
  },

  // South side of Agate Avenue (z > +13)
  {
    id: 'rocky_motel',
    name: 'Rocky Mountain Motel',
    subtitle: 'Vacancy · US-40 Lodge',
    x: -56,
    z: 24,
    w: 22,
    h: 7.2,
    d: 11,
    hp: 125,
    value: 145000,
    style: 'motel',
    signBg: '#7a2b20',
    signFg: '#fae49c',
    signFace: 'north',
    palette: [0xb49f83, 0x8c7056, 0x553b2c, 0xdcd2c2],
  },
  {
    id: 'muffler_shop',
    name: 'Alpine Muffler & Garage',
    subtitle: 'Heavy Welding & Exhaust',
    x: -24,
    z: 25,
    w: 16,
    h: 8.0,
    d: 13,
    hp: 120,
    value: 125000,
    style: 'garage',
    signBg: '#1f2933',
    signFg: '#f2b724',
    signFace: 'north',
    palette: [0x979a98, 0x626b73, 0x454d54, 0x89949f],
  },
  {
    id: 'mountain_lumber',
    name: 'Mountain Lumber Co.',
    subtitle: 'Timber & Hardware Depot',
    x: 16,
    z: 26,
    w: 20,
    h: 8.6,
    d: 13.5,
    hp: 135,
    value: 155000,
    style: 'lumber',
    signBg: '#2f4a2e',
    signFg: '#f5ead6',
    signFace: 'north',
    palette: [0x9e774d, 0x7a5733, 0x88939e, 0xc5a273],
  },
  {
    id: 'agate_propane',
    name: 'Agate Propane Depot',
    subtitle: 'Pressurized Fuel Tanks',
    x: 50,
    z: 26,
    w: 16,
    h: 7.5,
    d: 12,
    hp: 90,
    value: 190000,
    style: 'propane',
    signBg: '#8c2318',
    signFg: '#ffe473',
    signFace: 'north',
    isExplosive: true,
    palette: [0xdde2e6, 0xb8402e, 0x5b646e, 0x9aa2aa],
  },

  // Outer Granby Valley Landmarks (Jasper Ave & Ridge)
  {
    id: 'ranch_barn',
    name: 'Middle Park Feed Barn',
    subtitle: 'Hay · Tack · Ranch Supply',
    x: -44,
    z: 62,
    w: 18,
    h: 11.2,
    d: 14,
    hp: 115,
    value: 130000,
    style: 'barn',
    signBg: '#6e211a',
    signFg: '#f7efe1',
    signFace: 'north',
    palette: [0x8b2f26, 0x61201a, 0xefeae0, 0x45494e],
  },
  {
    id: 'water_tower',
    name: 'Granby Water Tower',
    subtitle: 'Municipal Tank · Coolant',
    x: 36,
    z: -62,
    w: 11,
    h: 18.0,
    d: 11,
    hp: 95,
    value: 165000,
    style: 'watertower',
    signBg: '#1c4a6b',
    signFg: '#e8f5ff',
    signFace: 'south',
    isCooling: true,
    palette: [0x708394, 0x536370, 0x89a8be, 0x3b4956],
  },
];

export function createGranbyWorld(
  scene: THREE.Scene,
  textures: ProceduralTextureSet
): GranbyWorld {
  const disposablesGeo: THREE.BufferGeometry[] = [];
  const disposablesMat: THREE.Material[] = [];

  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposablesGeo.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    disposablesMat.push(m);
    return m;
  };

  // Shared materials
  const groundMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.groundDirt,
      roughness: 0.94,
      metalness: 0.02,
    })
  );
  const asphaltMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.asphaltRoad,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const crossRoadMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.crossRoad,
      roughness: 0.9,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const sidewalkMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xb4b1a8,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const brickMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.brickWall,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const sandstoneMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.sandstoneWall,
      roughness: 0.82,
      metalness: 0.06,
    })
  );
  const woodMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.woodSiding,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const barnMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.barnWood,
      roughness: 0.86,
      metalness: 0.05,
    })
  );
  const metalMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.corrugatedMetal,
      roughness: 0.45,
      metalness: 0.65,
    })
  );
  const concreteMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.concreteWall,
      roughness: 0.9,
      metalness: 0.05,
    })
  );
  const roofMat = regMat(
    new THREE.MeshStandardMaterial({
      map: textures.roofShingles,
      roughness: 0.9,
      metalness: 0.08,
    })
  );
  const darkTrimMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x353c43,
      roughness: 0.65,
      metalness: 0.35,
    })
  );
  const whiteTrimMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xeae5da,
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  const siloMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xbec5cc,
      roughness: 0.42,
      metalness: 0.52,
    })
  );
  const tankWhiteMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6eaee,
      roughness: 0.35,
      metalness: 0.3,
    })
  );
  const redAccentMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xc23829,
      roughness: 0.55,
      metalness: 0.2,
    })
  );
  const waterTankWoodMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x73889b,
      roughness: 0.5,
      metalness: 0.45,
    })
  );
  const rubbleMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x6f685f,
      roughness: 0.95,
      metalness: 0.04,
    })
  );

  // 1. EXPANSIVE VALLEY FLOOR + SURROUNDING ROCKY MOUNTAINS (No box walls!)
  const terrain = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(540, 540)), groundMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Ring of dramatic Colorado Rocky Mountain peaks around the outer horizon (radius 145–230)
  const mountainRockMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x6a6e75,
      roughness: 0.94,
      metalness: 0.04,
      flatShading: true,
    })
  );
  const mountainSnowMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xeef3f8,
      roughness: 0.72,
      metalness: 0.02,
      flatShading: true,
    })
  );
  const foothillMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c684c,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true,
    })
  );

  const peakCount = 34;
  for (let i = 0; i < peakCount; i++) {
    const angle = (i / peakCount) * Math.PI * 2 + (i % 2) * 0.06;
    const dist = 168 + ((i * 37) % 45);
    const radius = 32 + ((i * 19) % 24);
    const height = 42 + ((i * 29) % 46);

    const peakGroup = new THREE.Group();
    peakGroup.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

    const cone = new THREE.Mesh(regGeo(new THREE.ConeGeometry(radius, height, 6)), mountainRockMat);
    cone.position.y = height * 0.5 - 2;
    cone.rotation.y = i * 1.1;
    peakGroup.add(cone);

    // Snow cap on taller Rockies peaks
    if (height > 54) {
      const capH = height * 0.36;
      const capR = radius * 0.365;
      const cap = new THREE.Mesh(regGeo(new THREE.ConeGeometry(capR, capH, 6)), mountainSnowMat);
      cap.position.y = height - capH * 0.5 - 1.9;
      cap.rotation.y = i * 1.1;
      peakGroup.add(cap);
    }
    scene.add(peakGroup);

    // Closer pine-covered foothills
    const hillDist = 122 + ((i * 17) % 22);
    const hillH = 14 + ((i * 13) % 14);
    const hill = new THREE.Mesh(regGeo(new THREE.ConeGeometry(24, hillH, 7)), foothillMat);
    hill.position.set(
      Math.cos(angle + 0.09) * hillDist,
      hillH * 0.5 - 1.5,
      Math.sin(angle + 0.09) * hillDist
    );
    scene.add(hill);
  }

  // 2. GRANBY ROAD NETWORK — Agate Avenue (US-40) + Side Streets + Concrete Sidewalks
  // Main Agate Ave (East-West along Z = 0)
  const agateAve = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(16, 260)), asphaltMat);
  agateAve.rotation.x = -Math.PI / 2;
  agateAve.rotation.z = Math.PI / 2;
  agateAve.position.set(0, 0.025, 0);
  agateAve.receiveShadow = true;
  scene.add(agateAve);

  // Sidewalks flanking Agate Ave
  [-10.2, 10.2].forEach((sz) => {
    const walk = new THREE.Mesh(regGeo(new THREE.BoxGeometry(195, 0.14, 4.2)), sidewalkMat);
    walk.position.set(0, 0.07, sz);
    walk.receiveShadow = true;
    scene.add(walk);
  });

  // Cross streets (Zero St, 1st St, 2nd St, 3rd St)
  [-74, -40, 2, 34, 66].forEach((cx) => {
    const street = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(9.5, 160)), crossRoadMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(cx, 0.02, 0);
    street.receiveShadow = true;
    scene.add(street);
  });

  // Jasper Ave (parallel south street) & North Service Road
  [-44, 44].forEach((rz) => {
    const road = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(9.2, 180)), crossRoadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(0, 0.018, rz);
    road.receiveShadow = true;
    scene.add(road);
  });

  // 3. INSTANCED PONDEROSA PINE FOREST RINGING GRANBY
  const pinePositions: { x: number; z: number; scale: number; tint: number }[] = [];
  for (let i = 0; i < 210; i++) {
    const a = (i / 210) * Math.PI * 2 + Math.sin(i * 12.7) * 0.14;
    const r = 96 + ((i * 29) % 44);
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    // Keep US-40 east-west highway corridor clear
    if (Math.abs(pz) < 13) continue;
    pinePositions.push({
      x: px,
      z: pz,
      scale: 0.85 + ((i * 19) % 30) / 100, // ±15% variation
      tint: i % 3 === 0 ? 0x2a4932 : i % 3 === 1 ? 0x345739 : 0x233d29,
    });
  }
  // A few scattered town trees on outer lots
  [
    [-82, -22],
    [-80, 24],
    [82, -20],
    [76, 26],
    [-12, -60],
    [-64, 58],
    [62, -58],
    [12, 64],
    [64, 60],
    [-20, 66],
  ].forEach(([tx, tz], idx) => {
    pinePositions.push({
      x: tx,
      z: tz,
      scale: 0.9 + (idx % 3) * 0.12,
      tint: 0x2e5034,
    });
  });

  const treeCount = pinePositions.length;
  const trunkGeo = regGeo(new THREE.CylinderGeometry(0.28, 0.42, 2.8, 7));
  const trunkMat = regMat(new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.94 }));
  const pineCone1Geo = regGeo(new THREE.ConeGeometry(2.3, 4.8, 7));
  const pineCone2Geo = regGeo(new THREE.ConeGeometry(1.75, 4.2, 7));
  const pineFoliageMat = regMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true })
  );

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const cone1Inst = new THREE.InstancedMesh(pineCone1Geo, pineFoliageMat, treeCount);
  const cone2Inst = new THREE.InstancedMesh(pineCone2Geo, pineFoliageMat, treeCount);
  trunkInst.castShadow = true;
  cone1Inst.castShadow = true;
  cone2Inst.castShadow = true;

  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  pinePositions.forEach((p, idx) => {
    dummy.position.set(p.x, 1.4 * p.scale, p.z);
    dummy.rotation.set(0, idx * 1.3, 0);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(p.x, 4.4 * p.scale, p.z);
    dummy.updateMatrix();
    cone1Inst.setMatrixAt(idx, dummy.matrix);
    cone1Inst.setColorAt(idx, c.setHex(p.tint));

    dummy.position.set(p.x, 6.8 * p.scale, p.z);
    dummy.updateMatrix();
    cone2Inst.setMatrixAt(idx, dummy.matrix);
    cone2Inst.setColorAt(idx, c.setHex(p.tint).multiplyScalar(1.12));
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  cone1Inst.instanceMatrix.needsUpdate = true;
  cone2Inst.instanceMatrix.needsUpdate = true;
  if (cone1Inst.instanceColor) cone1Inst.instanceColor.needsUpdate = true;
  if (cone2Inst.instanceColor) cone2Inst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  cone1Inst.computeBoundingSphere();
  cone2Inst.computeBoundingSphere();

  scene.add(trunkInst, cone1Inst, cone2Inst);

  // 4. BUILD 12 COMPOSITE MULTI-PART GRANBY LANDMARK BUILDINGS
  const buildings: BuildingInstance[] = [];

  for (const spec of BUILDING_SPECS) {
    const structureGroup = new THREE.Group();
    structureGroup.position.set(spec.x, 0, spec.z);

    // Concrete foundation pad
    const foundation = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(spec.w + 1.2, 0.35, spec.d + 1.2)),
      sidewalkMat
    );
    foundation.position.y = 0.175;
    foundation.receiveShadow = true;
    structureGroup.add(foundation);

    const signZ = spec.signFace === 'south' ? spec.d * 0.5 + 0.16 : -spec.d * 0.5 - 0.16;
    const signRotY = spec.signFace === 'south' ? 0 : Math.PI;

    const addSignboard = (y: number, width: number, height: number, zOverride?: number) => {
      const signTex = textures.getSignTexture(spec.name, spec.subtitle, spec.signBg, spec.signFg);
      const signMat = regMat(
        new THREE.MeshStandardMaterial({
          map: signTex,
          roughness: 0.55,
          metalness: 0.08,
        })
      );
      const board = new THREE.Mesh(regGeo(new THREE.BoxGeometry(width, height, 0.22)), [
        darkTrimMat,
        darkTrimMat,
        darkTrimMat,
        darkTrimMat,
        spec.signFace === 'south' ? signMat : darkTrimMat,
        spec.signFace === 'north' ? signMat : darkTrimMat,
      ]);
      board.position.set(0, y, zOverride ?? signZ);
      board.castShadow = true;
      structureGroup.add(board);
    };

    const addShadowBox = (
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const m = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w, h, d)), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      structureGroup.add(m);
      return m;
    };

    if (spec.style === 'townhall') {
      // Main brick hall + limestone lower base + portico columns + clock cupola
      addShadowBox(spec.w, 2.2, spec.d, sandstoneMat, 0, 1.4, 0);
      addShadowBox(spec.w - 0.4, spec.h - 2.4, spec.d - 0.4, brickMat, 0, 2.4 + (spec.h - 2.4) * 0.5, 0);
      addShadowBox(spec.w + 0.9, 0.65, spec.d + 0.9, whiteTrimMat, 0, spec.h + 0.1, 0);

      // Front classical portico columns
      for (const cx of [-4.5, -1.8, 1.8, 4.5]) {
        const col = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.35, 0.42, 6.4, 10)), whiteTrimMat);
        col.position.set(cx, 3.4, spec.d * 0.5 + 1.4);
        col.castShadow = true;
        structureGroup.add(col);
      }
      addShadowBox(11.5, 1.1, 3.2, whiteTrimMat, 0, 6.9, spec.d * 0.5 + 1.1);

      // Clock / Bell Cupola
      addShadowBox(4.2, 3.2, 4.2, whiteTrimMat, 0, spec.h + 2.0, 0);
      const cupolaRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(3.4, 2.8, 4)), darkTrimMat);
      cupolaRoof.rotation.y = Math.PI / 4;
      cupolaRoof.position.set(0, spec.h + 4.9, 0);
      cupolaRoof.castShadow = true;
      structureGroup.add(cupolaRoof);

      addSignboard(7.0, 9.6, 2.0, spec.d * 0.5 + 2.8);
    } else if (spec.style === 'batchplant') {
      // Concrete industrial warehouse + 3 towering aggregate silos + inclined conveyor chute
      addShadowBox(spec.w * 0.62, 8.2, spec.d * 0.8, metalMat, -3.5, 4.4, 0);
      addShadowBox(spec.w * 0.66, 0.5, spec.d * 0.85, darkTrimMat, -3.5, 8.7, 0);

      // 3 Concrete Silos
      const siloGeo = regGeo(new THREE.CylinderGeometry(2.35, 2.35, 13.2, 14));
      [4.2, 7.6].forEach((sx, idx) => {
        const silo = new THREE.Mesh(siloGeo, siloMat);
        silo.position.set(sx, 6.8, idx === 0 ? -2.2 : 2.6);
        silo.castShadow = true;
        silo.receiveShadow = true;
        structureGroup.add(silo);

        const cap = new THREE.Mesh(regGeo(new THREE.ConeGeometry(2.5, 1.8, 14)), darkTrimMat);
        cap.position.set(sx, 14.2, idx === 0 ? -2.2 : 2.6);
        structureGroup.add(cap);
      });

      // Conveyor gantry beam
      const conveyor = addShadowBox(11, 1.1, 1.4, darkTrimMat, 0.8, 9.6, 0);
      conveyor.rotation.z = 0.28;
      addSignboard(6.8, 11.2, 2.2, spec.d * 0.4 + 0.25);
    } else if (spec.style === 'bank') {
      // Fortified sandstone bank with heavy cornice & corner pilasters
      addShadowBox(spec.w, spec.h, spec.d, sandstoneMat, 0, spec.h * 0.5 + 0.2, 0);
      addShadowBox(spec.w + 1.1, 1.0, spec.d + 1.1, whiteTrimMat, 0, spec.h + 0.6, 0);
      addShadowBox(spec.w - 1.2, 1.6, spec.d - 1.2, darkTrimMat, 0, spec.h + 1.5, 0);
      // Corner pilasters
      for (const px of [-spec.w * 0.48, spec.w * 0.48]) {
        for (const pz of [-spec.d * 0.48, spec.d * 0.48]) {
          addShadowBox(1.1, spec.h + 0.3, 1.1, whiteTrimMat, px, spec.h * 0.5 + 0.2, pz);
        }
      }
      addSignboard(8.6, 11.0, 2.1);
    } else if (spec.style === 'propane') {
      // Office shack + 3 giant horizontal pressurized propane tanks on steel cradles!
      addShadowBox(6.8, 5.4, 7.5, metalMat, -4.4, 2.9, 0);
      addShadowBox(7.4, 0.5, 8.0, redAccentMat, -4.4, 5.8, 0);

      const tankGeo = regGeo(new THREE.CapsuleGeometry(1.45, 6.2, 8, 14));
      tankGeo.rotateZ(Math.PI / 2);
      [-3.4, 0, 3.4].forEach((tz) => {
        const tank = new THREE.Mesh(tankGeo, tankWhiteMat);
        tank.position.set(3.2, 2.4, tz);
        tank.castShadow = true;
        structureGroup.add(tank);

        // Red hazard band around tank
        const band = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(1.49, 1.49, 0.7, 14)), redAccentMat);
        band.rotation.z = Math.PI / 2;
        band.position.set(3.2, 2.4, tz);
        structureGroup.add(band);

        // Cradles
        addShadowBox(0.5, 1.3, 1.9, darkTrimMat, 1.0, 0.85, tz);
        addShadowBox(0.5, 1.3, 1.9, darkTrimMat, 5.4, 0.85, tz);
      });
      addSignboard(5.2, 9.6, 1.9, -4.0);
    } else if (spec.style === 'watertower') {
      // 4 angled steel lattice legs + cylindrical water tank + conical roof
      const legGeo = regGeo(new THREE.CylinderGeometry(0.32, 0.42, 11.8, 8));
      [
        [-3.2, -3.2],
        [3.2, -3.2],
        [-3.2, 3.2],
        [3.2, 3.2],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, darkTrimMat);
        leg.position.set(lx, 5.9, lz);
        leg.rotation.z = lx > 0 ? 0.1 : -0.1;
        leg.rotation.x = lz > 0 ? -0.1 : 0.1;
        leg.castShadow = true;
        structureGroup.add(leg);
      });
      // Cross braces
      addShadowBox(6.8, 0.35, 0.35, darkTrimMat, 0, 5.5, 3.0);
      addShadowBox(6.8, 0.35, 0.35, darkTrimMat, 0, 5.5, -3.0);
      addShadowBox(0.35, 0.35, 6.8, darkTrimMat, 3.0, 5.5, 0);
      addShadowBox(0.35, 0.35, 6.8, darkTrimMat, -3.0, 5.5, 0);

      // Tank barrel
      const barrel = new THREE.Mesh(
        regGeo(new THREE.CylinderGeometry(4.4, 4.4, 5.8, 16)),
        waterTankWoodMat
      );
      barrel.position.set(0, 14.2, 0);
      barrel.castShadow = true;
      structureGroup.add(barrel);

      // Conical roof
      const cone = new THREE.Mesh(regGeo(new THREE.ConeGeometry(4.9, 2.8, 16)), darkTrimMat);
      cone.position.set(0, 18.4, 0);
      cone.castShadow = true;
      structureGroup.add(cone);

      addSignboard(14.2, 7.6, 1.9, 4.55);
    } else if (spec.style === 'barn') {
      // Red timber feed barn with pitched roof & hay loft overhang
      addShadowBox(spec.w, 6.8, spec.d, barnMat, 0, 3.6, 0);
      const roof = new THREE.Mesh(
        regGeo(new THREE.CylinderGeometry(0.1, spec.d * 0.72, spec.w + 1.2, 4)),
        roofMat
      );
      roof.rotation.z = Math.PI / 2;
      roof.rotation.x = Math.PI / 4;
      roof.position.set(0, 8.9, 0);
      roof.castShadow = true;
      structureGroup.add(roof);

      // White trim beams
      addShadowBox(spec.w + 0.5, 0.45, spec.d + 0.5, whiteTrimMat, 0, 7.0, 0);
      addSignboard(6.8, 10.4, 2.0);
    } else if (spec.style === 'motel') {
      // Long 1960s Colorado highway lodge with covered walkway pillars
      addShadowBox(spec.w, spec.h, spec.d - 2.2, woodMat, 0, spec.h * 0.5 + 0.2, 1.0);
      addShadowBox(spec.w + 1.4, 0.75, spec.d + 0.8, roofMat, 0, spec.h + 0.5, 0);
      // Porch columns on north (Agate Ave) side
      for (let px = -9; px <= 9; px += 3.6) {
        addShadowBox(0.32, spec.h, 0.32, whiteTrimMat, px, spec.h * 0.5 + 0.2, -spec.d * 0.5 + 0.4);
      }
      // Tall roadside pylon sign!
      addShadowBox(0.6, 10.5, 0.6, darkTrimMat, -spec.w * 0.45, 5.2, -spec.d * 0.5 - 1.2);
      addSignboard(9.4, 10.2, 2.4, -spec.d * 0.5 - 1.2);
    } else if (spec.style === 'garage') {
      // Cinderblock muffler & welding garage with parapet & roof vents
      addShadowBox(spec.w, spec.h, spec.d, concreteMat, 0, spec.h * 0.5 + 0.2, 0);
      addShadowBox(spec.w + 0.6, 0.9, spec.d + 0.6, darkTrimMat, 0, spec.h + 0.4, 0);
      // Roof exhaust turbine vents
      [-3.5, 3.5].forEach((vx) => {
        const vent = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 10)), siloMat);
        vent.position.set(vx, spec.h + 1.3, 0);
        structureGroup.add(vent);
      });
      addSignboard(6.9, 10.6, 2.0);
    } else if (spec.style === 'lumber') {
      // Long lumber warehouse + stacked timber racks outside
      addShadowBox(spec.w, spec.h, spec.d * 0.76, woodMat, 0, spec.h * 0.5 + 0.2, 1.4);
      const roof = addShadowBox(spec.w + 1.2, 0.6, spec.d + 0.8, metalMat, 0, spec.h + 0.4, 0.2);
      roof.rotation.x = 0.08;
      // Stacked timber bundles in front apron
      [-5.5, 5.5].forEach((tx) => {
        addShadowBox(4.8, 1.6, 2.2, woodMat, tx, 1.0, -spec.d * 0.46);
      });
      addSignboard(7.4, 11.4, 2.1, -spec.d * 0.38 - 0.1);
    } else {
      // Brick / Wood / Annex Western Main Street storefronts with false-front parapet & awning
      const wallMat = spec.style === 'wood' ? woodMat : brickMat;
      addShadowBox(spec.w, spec.h, spec.d, wallMat, 0, spec.h * 0.5 + 0.2, 0);
      // Western false-front stepped parapet facing Agate Ave
      const parapetZ = spec.signFace === 'south' ? spec.d * 0.5 - 0.4 : -spec.d * 0.5 + 0.4;
      addShadowBox(spec.w + 0.4, 1.8, 0.8, darkTrimMat, 0, spec.h + 1.0, parapetZ);
      // Storefront canopy awning
      const awningZ = spec.signFace === 'south' ? spec.d * 0.5 + 1.15 : -spec.d * 0.5 - 1.15;
      const awning = addShadowBox(spec.w - 0.8, 0.3, 2.4, redAccentMat, 0, 3.8, awningZ);
      awning.rotation.x = spec.signFace === 'south' ? 0.22 : -0.22;
      addSignboard(spec.h + 0.7, Math.min(spec.w - 1, 10.5), 2.0);
    }

    // Add quiet sign rotation alignment if needed
    void signRotY;

    // Rubble pile hidden under building, rising as it collapses
    const rubbleGroup = new THREE.Group();
    rubbleGroup.position.set(spec.x, 0, spec.z);
    rubbleGroup.scale.set(1, 0.01, 1);
    rubbleGroup.visible = false;

    const mound = new THREE.Mesh(
      regGeo(new THREE.DodecahedronGeometry(Math.max(spec.w, spec.d) * 0.42, 1)),
      rubbleMat
    );
    mound.scale.set(spec.w / Math.max(spec.w, spec.d), 0.32, spec.d / Math.max(spec.w, spec.d));
    mound.position.y = 0.6;
    mound.receiveShadow = true;
    rubbleGroup.add(mound);

    for (let r = 0; r < 6; r++) {
      const slab = new THREE.Mesh(
        regGeo(new THREE.BoxGeometry(2.4 + (r % 3), 0.7, 2.1 + ((r + 1) % 2))),
        r % 2 === 0 ? concreteMat : brickMat
      );
      const a = (r / 6) * Math.PI * 2;
      slab.position.set(Math.cos(a) * spec.w * 0.28, 0.65 + (r % 2) * 0.45, Math.sin(a) * spec.d * 0.28);
      slab.rotation.set(0.25 * (r % 3), a, 0.22 * ((r + 1) % 3));
      rubbleGroup.add(slab);
    }

    // Subtle ground target perimeter outline ring so landmarks are clearly legible targets
    const ringColor = spec.isCooling ? 0x38bdf8 : spec.isExplosive ? 0xef4444 : 0xeab308;
    const beaconRing = new THREE.Mesh(
      regGeo(new THREE.RingGeometry(Math.max(spec.w, spec.d) * 0.6, Math.max(spec.w, spec.d) * 0.66, 32)),
      regMat(
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.set(spec.x, 0.06, spec.z);

    scene.add(structureGroup, rubbleGroup, beaconRing);

    buildings.push({
      id: spec.id,
      name: spec.name,
      subtitle: spec.subtitle,
      x: spec.x,
      z: spec.z,
      w: spec.w,
      h: spec.h,
      d: spec.d,
      hp: spec.hp,
      maxHp: spec.hp,
      value: spec.value,
      destroyed: false,
      collapseProgress: 0,
      tiltX: 0,
      tiltZ: 0,
      palette: spec.palette,
      isExplosive: spec.isExplosive,
      isCooling: spec.isCooling,
      hitCooldown: 0,
      structureGroup,
      rubbleGroup,
      beaconRing,
    });
  }

  // 5. DESTRUCTIBLE TOWN PROPS (Parked Vehicles, Streetlamps, Cooling Fire Hydrants, Wooden Fences)
  const props: DestructibleProp[] = [];
  let propIdx = 0;

  // Composite 5-part Colorado Pickup Trucks & Town Cruisers parked along Agate Ave
  const vehicleColors = [0x2a4d69, 0x8f2d26, 0x3f6142, 0xd4a238, 0xe2e6eb, 0x1f2b3a];
  const vehiclePlacements: [number, number, number][] = [
    [-48, -9.2, 0],
    [-22, -9.2, Math.PI],
    [8, -9.2, 0],
    [32, -9.2, 0],
    [56, -9.2, Math.PI],
    [-36, 9.2, Math.PI],
    [-8, 9.2, 0],
    [24, 9.2, Math.PI],
    [46, 9.2, 0],
    [-58, 12.2, Math.PI / 2],
  ];

  const wheelGeo = regGeo(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 10));
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = regMat(new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.9 }));
  const glassMat = regMat(new THREE.MeshStandardMaterial({ color: 0x2a3f54, roughness: 0.18, metalness: 0.7 }));

  vehiclePlacements.forEach(([vx, vz, rotY], i) => {
    const car = new THREE.Group();
    const paint = regMat(
      new THREE.MeshStandardMaterial({
        color: vehicleColors[i % vehicleColors.length],
        roughness: 0.38,
        metalness: 0.42,
      })
    );
    const chassis = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.0, 0.82, 4.4)), paint);
    chassis.position.y = 0.82;
    chassis.castShadow = true;
    car.add(chassis);

    const cab = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.78, 0.72, 1.9)), paint);
    cab.position.set(0, 1.54, -0.2);
    cab.castShadow = true;
    car.add(cab);

    const windshield = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.66, 0.54, 1.96)), glassMat);
    windshield.position.set(0, 1.52, -0.2);
    car.add(windshield);

    // Police cruiser lightbar on every 3rd vehicle
    if (i % 3 === 2) {
      const bar = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.1, 0.18, 0.32)), redAccentMat);
      bar.position.set(0, 1.98, -0.2);
      car.add(bar);
    }

    for (const [wx, wz] of [
      [-0.95, -1.35],
      [0.95, -1.35],
      [-0.95, 1.35],
      [0.95, 1.35],
    ]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, 0.42, wz);
      car.add(w);
    }

    car.position.set(vx, 0, vz);
    car.rotation.y = rotY;
    scene.add(car);

    props.push({
      id: `veh_${propIdx++}`,
      kind: 'vehicle',
      x: vx,
      z: vz,
      radius: 2.1,
      destroyed: false,
      vx: 0,
      vy: 0,
      vz: 0,
      vrx: 0,
      vrz: 0,
      flyTime: 0,
      value: 14500,
      mesh: car,
      origX: vx,
      origY: 0,
      origZ: vz,
      origRotY: rotY,
    });
  });

  // Streetlamps along Agate Avenue
  const poleGeo = regGeo(new THREE.CylinderGeometry(0.11, 0.16, 6.2, 7));
  const armGeo = regGeo(new THREE.BoxGeometry(0.14, 0.14, 1.6));
  const bulbMat = regMat(
    new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xffd980, emissiveIntensity: 1.2 })
  );

  for (let lx = -72; lx <= 72; lx += 24) {
    for (const lz of [-11.6, 11.6]) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, darkTrimMat);
      pole.position.y = 3.1;
      pole.castShadow = true;
      lamp.add(pole);

      const arm = new THREE.Mesh(armGeo, darkTrimMat);
      arm.position.set(0, 6.1, lz < 0 ? 0.7 : -0.7);
      lamp.add(arm);

      const head = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.42, 0.18, 0.6)), bulbMat);
      head.position.set(0, 5.95, lz < 0 ? 1.35 : -1.35);
      lamp.add(head);

      lamp.position.set(lx, 0, lz);
      scene.add(lamp);

      props.push({
        id: `lamp_${propIdx++}`,
        kind: 'lamp',
        x: lx,
        z: lz,
        radius: 0.75,
        destroyed: false,
        vx: 0,
        vy: 0,
        vz: 0,
        vrx: 0,
        vrz: 0,
        flyTime: 0,
        value: 2500,
        mesh: lamp,
        origX: lx,
        origY: 0,
        origZ: lz,
        origRotY: 0,
      });
    }
  }

  // Fire Hydrants along sidewalks (Smashing sprays water geyser & cools overheated radiator!)
  const hydrantCoords: [number, number][] = [
    [-54, -10.8],
    [-16, -10.8],
    [28, -10.8],
    [-42, 10.8],
    [14, 10.8],
    [60, 10.8],
  ];
  const hydrantBodyGeo = regGeo(new THREE.CylinderGeometry(0.26, 0.3, 1.05, 8));
  const hydrantCapGeo = regGeo(new THREE.SphereGeometry(0.28, 8, 6));
  const hydrantMat = regMat(new THREE.MeshStandardMaterial({ color: 0xd63226, roughness: 0.45, metalness: 0.35 }));

  hydrantCoords.forEach(([hx, hz]) => {
    const hyd = new THREE.Group();
    const b = new THREE.Mesh(hydrantBodyGeo, hydrantMat);
    b.position.y = 0.52;
    hyd.add(b);
    const cap = new THREE.Mesh(hydrantCapGeo, hydrantMat);
    cap.position.y = 1.05;
    hyd.add(cap);
    const nozzle = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.72, 0.2, 0.2)), siloMat);
    nozzle.position.y = 0.76;
    hyd.add(nozzle);

    hyd.position.set(hx, 0, hz);
    scene.add(hyd);

    props.push({
      id: `hyd_${propIdx++}`,
      kind: 'hydrant',
      x: hx,
      z: hz,
      radius: 0.9,
      destroyed: false,
      vx: 0,
      vy: 0,
      vz: 0,
      vrx: 0,
      vrz: 0,
      flyTime: 0,
      value: 3500,
      mesh: hyd,
      origX: hx,
      origY: 0,
      origZ: hz,
      origRotY: 0,
    });
  });

  // Wooden Ranch Fence sections near the Feed Barn & outer lots
  const fenceGeo = regGeo(new THREE.BoxGeometry(6.5, 1.35, 0.24));
  [
    [-58, 50, 0],
    [-50, 50, 0],
    [-34, 50, 0],
    [-26, 50, 0],
    [22, -52, 0],
    [48, -52, 0],
  ].forEach(([fx, fz, rot]) => {
    const f = new THREE.Mesh(fenceGeo, woodMat);
    f.position.set(fx, 0.68, fz);
    f.rotation.y = rot;
    f.castShadow = true;
    scene.add(f);

    props.push({
      id: `fence_${propIdx++}`,
      kind: 'fence',
      x: fx,
      z: fz,
      radius: 2.2,
      destroyed: false,
      vx: 0,
      vy: 0,
      vz: 0,
      vrx: 0,
      vrz: 0,
      flyTime: 0,
      value: 1500,
      mesh: f,
      origX: fx,
      origY: 0.68,
      origZ: fz,
      origRotY: rot,
    });
  });

  const resetWorld = () => {
    for (const b of buildings) {
      b.hp = b.maxHp;
      b.destroyed = false;
      b.collapseProgress = 0;
      b.tiltX = 0;
      b.tiltZ = 0;
      b.hitCooldown = 0;
      b.structureGroup.visible = true;
      b.structureGroup.position.set(b.x, 0, b.z);
      b.structureGroup.rotation.set(0, 0, 0);
      b.structureGroup.scale.set(1, 1, 1);
      b.rubbleGroup.visible = false;
      b.rubbleGroup.scale.set(1, 0.01, 1);
      b.beaconRing.visible = true;
    }
    for (const p of props) {
      p.destroyed = false;
      p.x = p.origX;
      p.z = p.origZ;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.vrx = 0;
      p.vrz = 0;
      p.flyTime = 0;
      p.mesh.visible = true;
      p.mesh.position.set(p.origX, p.origY, p.origZ);
      p.mesh.rotation.set(0, p.origRotY, 0);
    }
  };

  return {
    buildings,
    props,
    playBounds: 94,
    resetWorld,
    dispose: () => {
      disposablesGeo.forEach((g) => g.dispose());
      disposablesMat.forEach((m) => m.dispose());
    },
  };
}
