import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';
import type { HullStyle } from './types';

export interface DozerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  bladePivot: THREE.Group;
  leftPiston: THREE.Mesh;
  rightPiston: THREE.Mesh;
  armoredGroup: THREE.Group;
  factoryGroup: THREE.Group;
  trackBeltMat: THREE.MeshStandardMaterial;
  exhaustLeftPos: THREE.Object3D;
  exhaustRightPos: THREE.Object3D;
  setHullStyle: (style: HullStyle) => void;
  updateVisuals: (
    dt: number,
    speed: number,
    turnRate: number,
    ramAmount: number,
    time: number
  ) => void;
  dispose: () => void;
}

export function createKomatsuD355A(textures: ProceduralTextureSet): DozerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Materials with distinct roughness/metalness separation (>= 0.25 diff between adjacent parts)
  const yellowPaintMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.komatsuYellow,
      roughness: 0.44,
      metalness: 0.28,
    })
  );

  const armorSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.armorSteel,
      roughness: 0.62,
      metalness: 0.58,
    })
  );

  const heavyIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262b30,
      roughness: 0.72,
      metalness: 0.55,
    })
  );

  const bladeSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb08a24,
      map: textures.komatsuYellow,
      roughness: 0.46,
      metalness: 0.42,
    })
  );

  const wornEdgeSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8f98a2,
      roughness: 0.26,
      metalness: 0.88,
    })
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdce4ec,
      roughness: 0.14,
      metalness: 0.94,
    })
  );

  const matteRubberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2125,
      roughness: 0.9,
      metalness: 0.08,
    })
  );

  const headlightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff5d6,
      emissive: 0xffd275,
      emissiveIntensity: 1.6,
      roughness: 0.18,
      metalness: 0.1,
    })
  );

  // Clone track belt texture so its UV scroll belongs strictly to this bulldozer
  const beltTex = textures.trackBelt.clone();
  beltTex.needsUpdate = true;
  beltTex.wrapS = THREE.RepeatWrapping;
  beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.repeat.set(1, 6);
  beltTex.colorSpace = THREE.SRGBColorSpace;

  const trackBeltMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: beltTex,
      roughness: 0.84,
      metalness: 0.32,
    })
  );

  const castShadowMesh = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Grounded soft contact shadow directly under tracks (offset Y=0.025 so zero Z-fighting)
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(6.8, 9.2)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
      })
    )
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.03, 0.25);
  root.add(shadowPlane);

  // 1. TWIN CRAWLER TRACK ASSEMBLIES (Left & Right, grounded flush at y = 0)
  // Forward direction is -Z!
  const trackShape = new THREE.Shape();
  trackShape.moveTo(-2.35, 0.0);
  trackShape.lineTo(2.35, 0.0);
  trackShape.absarc(2.35, 0.65, 0.65, -Math.PI / 2, Math.PI / 2, false);
  trackShape.lineTo(-2.35, 1.3);
  trackShape.absarc(-2.35, 0.65, 0.65, Math.PI / 2, (3 * Math.PI) / 2, false);

  const trackExtrudeGeo = trackGeo(
    new THREE.ExtrudeGeometry(trackShape, {
      depth: 0.92,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
    })
  );
  trackExtrudeGeo.center();
  // Rotate so length runs along Z, width along X, height along Y
  trackExtrudeGeo.rotateY(Math.PI / 2);

  const rollerGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.98, 12));
  rollerGeo.rotateZ(Math.PI / 2);
  const sprocketGeo = trackGeo(new THREE.CylinderGeometry(0.58, 0.58, 1.02, 14));
  sprocketGeo.rotateZ(Math.PI / 2);

  [-1.62, 1.62].forEach((sideX) => {
    const trackUnit = new THREE.Group();
    trackUnit.position.set(sideX, 0.68, 0.25);

    const beltMesh = castShadowMesh(new THREE.Mesh(trackExtrudeGeo, trackBeltMat));
    trackUnit.add(beltMesh);

    // Side track roller frame (Komatsu yellow structural beam)
    const frameBeam = castShadowMesh(
      new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.55, 4.4)), yellowPaintMat)
    );
    frameBeam.position.set(0, 0.02, 0);
    trackUnit.add(frameBeam);

    // Front idler & rear drive sprocket
    const frontIdler = castShadowMesh(new THREE.Mesh(sprocketGeo, heavyIronMat));
    frontIdler.position.set(0, 0, -2.25);
    trackUnit.add(frontIdler);

    const rearSprocket = castShadowMesh(new THREE.Mesh(sprocketGeo, heavyIronMat));
    rearSprocket.position.set(0, 0.08, 2.25);
    trackUnit.add(rearSprocket);

    // Lower bogie rollers
    for (let rz = -1.5; rz <= 1.5; rz += 0.75) {
      const roller = new THREE.Mesh(rollerGeo, heavyIronMat);
      roller.position.set(0, -0.34, rz);
      trackUnit.add(roller);
    }

    bodyGroup.add(trackUnit);
  });

  // 2. LOWER CHASSIS & ENGINE BLOCK CORE (Komatsu Yellow)
  const lowerHull = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.35, 1.05, 5.2)), yellowPaintMat)
  );
  lowerHull.position.set(0, 1.28, 0.2);
  bodyGroup.add(lowerHull);

  // Heavy equalizer bar connecting tracks
  const eqBar = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.4, 0.55)), heavyIronMat)
  );
  eqBar.position.set(0, 0.78, -1.1);
  bodyGroup.add(eqBar);

  // 3. ARMORED CASEMATE SHELL (Toggleable 'armored' style)
  const armoredGroup = new THREE.Group();
  bodyGroup.add(armoredGroup);

  // Main sloped composite steel-concrete armor box covering hood & operator cab
  const armorLower = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.25, 1.25, 5.35)), armorSteelMat)
  );
  armorLower.position.set(0, 1.85, 0.35);
  armoredGroup.add(armorLower);

  // Sloped upper casemate / fortified cab
  const casemateGeo = trackGeo(new THREE.CylinderGeometry(1.45, 2.1, 1.38, 4));
  casemateGeo.rotateY(Math.PI / 4);
  casemateGeo.scale(1.15, 1.0, 1.68);
  const casemate = castShadowMesh(new THREE.Mesh(casemateGeo, armorSteelMat));
  casemate.position.set(0, 3.05, 0.65);
  armoredGroup.add(casemate);

  // Front angled radiator armor glacis plate
  const frontGlacis = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.75, 1.65, 0.36)), armorSteelMat)
  );
  frontGlacis.position.set(0, 1.95, -2.35);
  frontGlacis.rotation.x = 0.22;
  armoredGroup.add(frontGlacis);

  // Armored side skirts shielding the upper tracks
  [-2.08, 2.08].forEach((sx) => {
    const skirt = castShadowMesh(
      new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 1.05, 5.15)), armorSteelMat)
    );
    skirt.position.set(sx, 1.48, 0.3);
    armoredGroup.add(skirt);
  });

  // Armored camera visor ports (front & sides)
  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x16222e,
      roughness: 0.15,
      metalness: 0.85,
    })
  );
  const frontPort = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.9, 0.24, 0.18)), visorMat);
  frontPort.position.set(0, 3.12, -1.16);
  armoredGroup.add(frontPort);

  // Roof hatch & armored camera dome
  const roofHatch = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.18, 1.15)), heavyIronMat)
  );
  roofHatch.position.set(0, 3.8, 0.7);
  armoredGroup.add(roofHatch);

  // Armored work spotlights
  [-0.95, 0.95].forEach((lx) => {
    const lampHousing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.26, 0.28)),
      heavyIronMat
    );
    lampHousing.position.set(lx, 2.68, -2.18);
    armoredGroup.add(lampHousing);

    const lens = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.18, 0.06)), headlightMat);
    lens.position.set(lx, 2.68, -2.32);
    armoredGroup.add(lens);
  });

  // 4. FACTORY KOMATSU D355A SHELL (Toggleable 'factory' style)
  const factoryGroup = new THREE.Group();
  factoryGroup.visible = false;
  bodyGroup.add(factoryGroup);

  const engineHood = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.05, 1.35, 3.05)), yellowPaintMat)
  );
  engineHood.position.set(0, 2.25, -0.78);
  factoryGroup.add(engineHood);

  // Front radiator grille slats
  const grille = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.72, 1.12, 0.15)),
    heavyIronMat
  );
  grille.position.set(0, 2.24, -2.32);
  factoryGroup.add(grille);

  // Operator platform & seat
  const seatBase = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.25, 0.72, 1.9)), yellowPaintMat)
  );
  seatBase.position.set(0, 2.02, 1.62);
  factoryGroup.add(seatBase);

  const seatBack = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.86, 0.85, 0.25)), matteRubberMat)
  );
  seatBack.position.set(0, 2.75, 2.15);
  factoryGroup.add(seatBack);

  // ROPS Heavy Roll Cage (4 pillars + roof canopy)
  const ropsRoof = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.55, 0.22, 2.4)), yellowPaintMat)
  );
  ropsRoof.position.set(0, 3.92, 1.35);
  factoryGroup.add(ropsRoof);

  const pillarGeo = trackGeo(new THREE.BoxGeometry(0.18, 1.9, 0.18));
  [
    [-1.12, 0.35],
    [1.12, 0.35],
    [-1.12, 2.38],
    [1.12, 2.38],
  ].forEach(([px, pz]) => {
    const pillar = castShadowMesh(new THREE.Mesh(pillarGeo, heavyIronMat));
    pillar.position.set(px, 2.95, pz);
    factoryGroup.add(pillar);
  });

  // Air intake pre-cleaner on hood
  const intake = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.2, 0.65, 12)), heavyIronMat)
  );
  intake.position.set(-0.48, 3.22, -0.5);
  factoryGroup.add(intake);

  // Factory headlights
  [-0.78, 0.78].forEach((lx) => {
    const lens = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10)), headlightMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(lx, 2.55, -2.36);
    factoryGroup.add(lens);
  });

  // 5. TWIN VERTICAL DIESEL EXHAUST STACKS (always visible on both variants!)
  const stackGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.15, 1.65, 10));
  const exhaustLeft = castShadowMesh(new THREE.Mesh(stackGeo, heavyIronMat));
  exhaustLeft.position.set(-0.78, 3.62, -0.95);
  bodyGroup.add(exhaustLeft);

  const exhaustRight = castShadowMesh(new THREE.Mesh(stackGeo, heavyIronMat));
  exhaustRight.position.set(0.78, 3.62, -0.95);
  bodyGroup.add(exhaustRight);

  const exhaustLeftPos = new THREE.Object3D();
  exhaustLeftPos.position.set(-0.78, 4.48, -0.95);
  bodyGroup.add(exhaustLeftPos);

  const exhaustRightPos = new THREE.Object3D();
  exhaustRightPos.position.set(0.78, 4.48, -0.95);
  bodyGroup.add(exhaustRightPos);

  // 6. MASSIVE SEMI-U DOZER BLADE ASSEMBLY (Articulated via bladePivot!)
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0, 0.72, -1.05);
  bodyGroup.add(bladePivot);

  // Heavy side push arms extending from track trunnions to blade back
  const pushArmGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.38, 2.95));
  [-2.05, 2.05].forEach((ax) => {
    const arm = castShadowMesh(new THREE.Mesh(pushArmGeo, yellowPaintMat));
    arm.position.set(ax, 0.04, -1.25);
    bladePivot.add(arm);
  });

  // Curved Semi-U blade cross-section extruded across width
  const bladeProfile = new THREE.Shape();
  bladeProfile.moveTo(0, 0);
  bladeProfile.lineTo(0.45, 0);
  bladeProfile.quadraticCurveTo(0.12, 0.95, 0.56, 2.08);
  bladeProfile.lineTo(0.18, 2.22);
  bladeProfile.quadraticCurveTo(-0.32, 1.0, 0, 0);

  const bladeGeo = trackGeo(
    new THREE.ExtrudeGeometry(bladeProfile, {
      depth: 5.5,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    })
  );
  bladeGeo.center();
  bladeGeo.rotateY(Math.PI / 2);

  const bladeMain = castShadowMesh(new THREE.Mesh(bladeGeo, bladeSteelMat));
  bladeMain.position.set(0, 0.54, -2.85);
  bladePivot.add(bladeMain);

  // Polished steel cutting edge along bottom of blade
  const cuttingEdge = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.68, 0.24, 0.24)), wornEdgeSteelMat)
  );
  cuttingEdge.position.set(0, -0.5, -3.14);
  bladePivot.add(cuttingEdge);

  // Angled side spill wings on blade ends
  [-2.78, 2.78].forEach((wx) => {
    const wing = castShadowMesh(
      new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 2.08, 0.85)), bladeSteelMat)
    );
    wing.position.set(wx, 0.52, -3.02);
    wing.rotation.y = wx < 0 ? 0.22 : -0.22;
    bladePivot.add(wing);
  });

  // Top perforated spill guard bar
  const spillGuard = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.42, 0.14)), heavyIronMat)
  );
  spillGuard.position.set(0, 1.72, -2.75);
  bladePivot.add(spillGuard);

  // Twin Hydraulic Lift Cylinders connecting front glacis to blade
  const cylOuterGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 1.55, 10));
  const pistonGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 1.25, 10));

  const leftCylOuter = castShadowMesh(new THREE.Mesh(cylOuterGeo, yellowPaintMat));
  leftCylOuter.position.set(-0.92, 2.25, -2.72);
  leftCylOuter.rotation.x = 0.34;
  bodyGroup.add(leftCylOuter);

  const rightCylOuter = castShadowMesh(new THREE.Mesh(cylOuterGeo, yellowPaintMat));
  rightCylOuter.position.set(0.92, 2.25, -2.72);
  rightCylOuter.rotation.x = 0.34;
  bodyGroup.add(rightCylOuter);

  const leftPiston = castShadowMesh(new THREE.Mesh(pistonGeo, chromeMat));
  leftPiston.position.set(-0.92, 1.55, -2.98);
  leftPiston.rotation.x = 0.34;
  bodyGroup.add(leftPiston);

  const rightPiston = castShadowMesh(new THREE.Mesh(pistonGeo, chromeMat));
  rightPiston.position.set(0.92, 1.55, -2.98);
  rightPiston.rotation.x = 0.34;
  bodyGroup.add(rightPiston);

  // 7. REAR GIANT SINGLE-SHANK HYDRAULIC RIPPER
  const ripperFrame = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.85, 0.58, 1.15)), yellowPaintMat)
  );
  ripperFrame.position.set(0, 1.32, 3.22);
  bodyGroup.add(ripperFrame);

  const ripperShank = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 1.68, 0.45)), heavyIronMat)
  );
  ripperShank.position.set(0, 0.85, 3.72);
  ripperShank.rotation.x = -0.25;
  bodyGroup.add(ripperShank);

  const ripperTooth = castShadowMesh(
    new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.2, 0.55, 6)), wornEdgeSteelMat)
  );
  ripperTooth.position.set(0, 0.14, 3.55);
  ripperTooth.rotation.x = -Math.PI * 0.62;
  bodyGroup.add(ripperTooth);

  const setHullStyle = (style: HullStyle) => {
    armoredGroup.visible = style === 'armored';
    factoryGroup.visible = style === 'factory';
  };

  let smoothPitch = 0;
  let smoothRoll = 0;
  let smoothBladeRot = 0;

  const updateVisuals = (
    dt: number,
    speed: number,
    turnRate: number,
    ramAmount: number,
    time: number
  ) => {
    // Scroll track treads proportionally to ground speed + pivot turn
    const treadVelocity = speed * 0.42 + Math.abs(turnRate) * 0.35;
    beltTex.offset.y = (beltTex.offset.y - treadVelocity * dt) % 1;

    // Heavy diesel engine vibration + pitch/roll inertia
    const idleVibe = Math.sin(time * 42) * (0.012 + ramAmount * 0.014);
    const targetPitch = THREE.MathUtils.clamp(-speed * 0.004 - ramAmount * 0.045, -0.09, 0.07);
    const targetRoll = THREE.MathUtils.clamp(turnRate * 0.04, -0.07, 0.07);

    const damp = 1 - Math.exp(-10 * dt);
    smoothPitch += (targetPitch - smoothPitch) * damp;
    smoothRoll += (targetRoll - smoothRoll) * damp;

    bodyGroup.position.y = Math.max(0, idleVibe);
    bodyGroup.rotation.x = smoothPitch;
    bodyGroup.rotation.z = smoothRoll;

    // Blade lowers/digs in aggressively when ramming, lifts slightly at cruise
    const targetBladeRot = ramAmount > 0.1 ? -0.14 : 0.06;
    smoothBladeRot += (targetBladeRot - smoothBladeRot) * (1 - Math.exp(-12 * dt));
    bladePivot.rotation.x = smoothBladeRot;

    const pistonDrop = smoothBladeRot * 1.4;
    leftPiston.position.y = 1.55 + pistonDrop;
    rightPiston.position.y = 1.55 + pistonDrop;
  };

  return {
    root,
    bodyGroup,
    bladePivot,
    leftPiston,
    rightPiston,
    armoredGroup,
    factoryGroup,
    trackBeltMat,
    exhaustLeftPos,
    exhaustRightPos,
    setHullStyle,
    updateVisuals,
    dispose: () => {
      beltTex.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
