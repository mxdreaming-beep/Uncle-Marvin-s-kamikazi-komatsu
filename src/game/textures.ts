import * as THREE from 'three';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextureSet {
  armorSteel: THREE.CanvasTexture;
  komatsuYellow: THREE.CanvasTexture;
  trackBelt: THREE.CanvasTexture;
  asphaltRoad: THREE.CanvasTexture;
  crossRoad: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  sandstoneWall: THREE.CanvasTexture;
  woodSiding: THREE.CanvasTexture;
  barnWood: THREE.CanvasTexture;
  corrugatedMetal: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  roofShingles: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  groundDirt: THREE.CanvasTexture;
  signTextures: Map<string, THREE.CanvasTexture>;
  getSignTexture: (title: string, subtitle: string, bg: string, fg: string) => THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.min(maxAnisotropy, 8);
  const allTextures: THREE.Texture[] = [];

  const track = (t: THREE.CanvasTexture) => {
    allTextures.push(t);
    return t;
  };

  // 1. Welded Armor Plate Steel
  const armorSteel = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#535b64';
    ctx.fillRect(0, 0, 512, 512);

    // Brushed steel grain & weathering
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 8 + Math.random() * 44;
      const shade = 70 + Math.floor(Math.random() * 32);
      ctx.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 9}, 0.22)`;
      ctx.fillRect(x, y, w, 2);
    }

    // Welded plate seams
    ctx.strokeStyle = '#2d3339';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 500);
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    // Weld bead highlights
    ctx.strokeStyle = '#7c8691';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 252);
    ctx.lineTo(512, 252);
    ctx.moveTo(252, 0);
    ctx.lineTo(252, 512);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rust & dust smudges along edges
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 6 + Math.random() * 24;
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(116, 78, 48, 0.25)');
      grad.addColorStop(1, 'rgba(116, 78, 48, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Bolts
    const boltCoords = [24, 232, 280, 488];
    for (const bx of boltCoords) {
      for (const by of boltCoords) {
        ctx.fillStyle = '#262b31';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b95a0';
        ctx.beginPath();
        ctx.arc(bx - 1, by - 1, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return track(finalizeColorTexture(c, aniso));
  })();

  // 2. Komatsu D355A Heavy Equipment Yellow Paint
  const komatsuYellow = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#d99b16';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle paint wear & dust grime
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 10 + Math.random() * 35;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(110, 74, 18, 0.14)' : 'rgba(246, 198, 66, 0.14)';
      ctx.fillRect(x, y, w, 3);
    }

    // Panel lines
    ctx.strokeStyle = '#6e4e0c';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 496);
    ctx.beginPath();
    ctx.moveTo(0, 170);
    ctx.lineTo(512, 170);
    ctx.stroke();

    // Caution diagonal stripes along bottom
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 444, 512, 68);
    ctx.clip();
    ctx.fillStyle = '#1f2328';
    ctx.fillRect(0, 444, 512, 68);
    ctx.fillStyle = '#eab308';
    for (let sx = -64; sx < 580; sx += 56) {
      ctx.beginPath();
      ctx.moveTo(sx, 512);
      ctx.lineTo(sx + 28, 512);
      ctx.lineTo(sx + 68, 444);
      ctx.lineTo(sx + 40, 444);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    return track(finalizeColorTexture(c, aniso));
  })();

  // 3. Crawler Track Grouser Belt
  const trackBelt = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#23262a';
    ctx.fillRect(0, 0, 256, 256);

    const bars = 8;
    const step = 256 / bars;
    for (let i = 0; i < bars; i++) {
      const y = i * step;
      ctx.fillStyle = '#393e44';
      ctx.fillRect(6, y + 3, 244, step - 10);
      // Raised steel grouser cleat
      ctx.fillStyle = '#626970';
      ctx.fillRect(10, y + 10, 236, 7);
      // Mud tint
      ctx.fillStyle = 'rgba(104, 82, 56, 0.35)';
      ctx.fillRect(10, y + 18, 236, 6);
    }
    const tex = finalizeColorTexture(c, aniso, 1, 5);
    return track(tex);
  })();

  // 4. Agate Avenue Asphalt Road
  const asphaltRoad = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#383d44';
    ctx.fillRect(0, 0, 512, 512);

    // Aggregate speckle
    for (let i = 0; i < 3800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = 42 + Math.floor(Math.random() * 44);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Tire wear tracks
    ctx.fillStyle = 'rgba(26, 29, 34, 0.32)';
    ctx.fillRect(96, 0, 74, 512);
    ctx.fillRect(342, 0, 74, 512);

    // White shoulder lines
    ctx.fillStyle = '#d8dce2';
    ctx.fillRect(22, 0, 10, 512);
    ctx.fillRect(480, 0, 10, 512);

    // Double yellow centerlines (US-40)
    ctx.fillStyle = '#e5a922';
    ctx.fillRect(244, 0, 8, 512);
    ctx.fillRect(260, 0, 8, 512);

    return track(finalizeColorTexture(c, aniso, 1, 14));
  })();

  // 5. Side Street Road
  const crossRoad = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#40454c';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = 48 + Math.floor(Math.random() * 38);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = '#d7b346';
    for (let y = 12; y < 256; y += 64) {
      ctx.fillRect(124, y, 8, 34);
    }
    return track(finalizeColorTexture(c, aniso, 1, 8));
  })();

  // 6. Red Brick Wall with Windows
  const brickWall = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#8b4232';
    ctx.fillRect(0, 0, 512, 512);

    const rows = 24;
    const cols = 10;
    const bh = 512 / rows;
    const bw = 512 / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw * 0.5);
      for (let col = -1; col <= cols; col++) {
        const tone = 115 + Math.floor(Math.random() * 44);
        const g = 46 + Math.floor(Math.random() * 22);
        const b = 36 + Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${tone},${g},${b})`;
        ctx.fillRect(col * bw + offset + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }

    // Architectural windows (2 rows x 3 cols)
    for (let wy = 70; wy <= 290; wy += 190) {
      for (let wx = 44; wx <= 364; wx += 160) {
        // Stone sill & lintel
        ctx.fillStyle = '#c8bfb0';
        ctx.fillRect(wx - 8, wy - 12, 112, 14);
        ctx.fillRect(wx - 8, wy + 116, 112, 14);
        // Dark window recess
        ctx.fillStyle = '#25313e';
        ctx.fillRect(wx, wy, 96, 116);
        // Glass reflection
        ctx.fillStyle = '#4e6c88';
        ctx.fillRect(wx + 6, wy + 6, 38, 48);
        ctx.fillRect(wx + 52, wy + 6, 38, 48);
        ctx.fillStyle = '#385068';
        ctx.fillRect(wx + 6, wy + 62, 38, 48);
        ctx.fillRect(wx + 52, wy + 62, 38, 48);
        // Mullions
        ctx.strokeStyle = '#dfd9ce';
        ctx.lineWidth = 4;
        ctx.strokeRect(wx, wy, 96, 116);
      }
    }
    return track(finalizeColorTexture(c, aniso));
  })();

  // 7. Sandstone / Limestone Civic Wall
  const sandstoneWall = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#c9bca3';
    ctx.fillRect(0, 0, 512, 512);

    for (let r = 0; r < 12; r++) {
      const y = r * (512 / 12);
      ctx.fillStyle = 'rgba(85, 74, 56, 0.28)';
      ctx.fillRect(0, y, 512, 3);
      for (let col = 0; col < 5; col++) {
        const x = col * 110 + (r % 2) * 55;
        ctx.fillStyle = `rgba(${180 + Math.random() * 30}, ${165 + Math.random() * 28}, ${140 + Math.random() * 24}, 0.35)`;
        ctx.fillRect(x, y + 3, 106, 39);
        ctx.fillStyle = 'rgba(85, 74, 56, 0.25)';
        ctx.fillRect(x, y, 3, 44);
      }
    }
    // Tall arched-feel civic windows
    for (let wx = 48; wx <= 368; wx += 160) {
      ctx.fillStyle = '#ece5d6';
      ctx.fillRect(wx - 10, 90, 116, 220);
      ctx.fillStyle = '#243547';
      ctx.fillRect(wx, 102, 96, 196);
      ctx.fillStyle = '#537391';
      ctx.fillRect(wx + 8, 110, 36, 84);
      ctx.fillRect(wx + 52, 110, 36, 84);
      ctx.fillRect(wx + 8, 204, 36, 84);
      ctx.fillRect(wx + 52, 204, 36, 84);
    }
    return track(finalizeColorTexture(c, aniso));
  })();

  // 8. Mountain Timber Clapboard Siding
  const woodSiding = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#9c7853';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 22) {
      const shade = Math.random() * 22 - 11;
      ctx.fillStyle = `rgb(${154 + shade}, ${118 + shade}, ${82 + shade})`;
      ctx.fillRect(0, y, 512, 20);
      ctx.fillStyle = '#5a4129';
      ctx.fillRect(0, y + 19, 512, 3);
    }
    // Storefront windows
    for (let wx = 54; wx <= 354; wx += 150) {
      ctx.fillStyle = '#ede6d8';
      ctx.fillRect(wx - 8, 130, 116, 150);
      ctx.fillStyle = '#283846';
      ctx.fillRect(wx, 138, 100, 134);
      ctx.fillStyle = '#60819c';
      ctx.fillRect(wx + 8, 146, 84, 56);
      ctx.fillStyle = '#3f5b72';
      ctx.fillRect(wx + 8, 210, 84, 54);
    }
    return track(finalizeColorTexture(c, aniso));
  })();

  // 9. Red Barn Timber
  const barnWood = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#8b2f26';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 28) {
      const d = Math.random() * 20 - 10;
      ctx.fillStyle = `rgb(${138 + d}, ${46 + d * 0.5}, ${38 + d * 0.5})`;
      ctx.fillRect(x, 0, 26, 512);
      ctx.fillStyle = '#4e1914';
      ctx.fillRect(x + 25, 0, 3, 512);
    }
    // Classic white cross-braced barn door silhouette
    ctx.strokeStyle = '#efeae0';
    ctx.lineWidth = 10;
    ctx.strokeRect(156, 220, 200, 280);
    ctx.beginPath();
    ctx.moveTo(156, 220);
    ctx.lineTo(356, 500);
    ctx.moveTo(356, 220);
    ctx.lineTo(156, 500);
    ctx.stroke();
    return track(finalizeColorTexture(c, aniso));
  })();

  // 10. Corrugated Industrial Metal
  const corrugatedMetal = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#89949f';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = '#a4b0bc';
      ctx.fillRect(x, 0, 8, 512);
      ctx.fillStyle = '#68737e';
      ctx.fillRect(x + 8, 0, 8, 512);
    }
    // Horizontal girts & rust band at base
    ctx.fillStyle = 'rgba(116, 72, 42, 0.28)';
    ctx.fillRect(0, 410, 512, 102);
    return track(finalizeColorTexture(c, aniso));
  })();

  // 11. Industrial Cinderblock Concrete Wall
  const concreteWall = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#9b9c98';
    ctx.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 16; r++) {
      const y = r * 32;
      for (let col = 0; col < 8; col++) {
        const x = col * 64 + (r % 2) * 32 - 32;
        const v = 138 + Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${v},${v},${v - 3})`;
        ctx.fillRect(x + 2, y + 2, 60, 28);
      }
    }
    // Roll-up garage bays
    for (let bx = 46; bx <= 286; bx += 220) {
      ctx.fillStyle = '#4e555d';
      ctx.fillRect(bx, 180, 176, 332);
      for (let sy = 190; sy < 512; sy += 26) {
        ctx.fillStyle = '#67707a';
        ctx.fillRect(bx + 6, sy, 164, 18);
      }
    }
    return track(finalizeColorTexture(c, aniso));
  })();

  // 12. Roof Shingles
  const roofShingles = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#3f454d';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      for (let x = 0; x < 256; x += 32) {
        const v = 54 + Math.floor(Math.random() * 22);
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 7})`;
        ctx.fillRect(x + ((y / 16) % 2) * 16, y, 30, 14);
      }
    }
    return track(finalizeColorTexture(c, aniso, 2, 2));
  })();

  // 13. Soft Radial Contact Shadow
  const contactShadow = (() => {
    const [c, ctx] = createCanvas(256, 256);
    const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 124);
    grad.addColorStop(0, 'rgba(10, 12, 15, 0.72)');
    grad.addColorStop(0.55, 'rgba(10, 12, 15, 0.36)');
    grad.addColorStop(1, 'rgba(10, 12, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    allTextures.push(tex);
    return tex;
  })();

  // 14. Colorado High-Desert Valley Ground
  const groundDirt = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#8b7b63';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1 + Math.random() * 5;
      const pick = Math.random();
      if (pick < 0.45) {
        ctx.fillStyle = 'rgba(114, 120, 74, 0.35)'; // dry sage grass
      } else if (pick < 0.8) {
        ctx.fillStyle = 'rgba(155, 134, 102, 0.32)'; // sandy loam
      } else {
        ctx.fillStyle = 'rgba(105, 86, 66, 0.35)'; // rocky earth
      }
      ctx.fillRect(x, y, r, r);
    }
    return track(finalizeColorTexture(c, aniso, 28, 28));
  })();

  const signTextures = new Map<string, THREE.CanvasTexture>();

  const getSignTexture = (title: string, subtitle: string, bg: string, fg: string) => {
    const key = `${title}|${subtitle}|${bg}|${fg}`;
    const existing = signTextures.get(key);
    if (existing) return existing;

    const [c, ctx] = createCanvas(512, 128);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);

    ctx.fillStyle = fg;
    ctx.font = '700 42px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), 256, 52);

    ctx.font = '600 20px "DM Sans", sans-serif';
    ctx.globalAlpha = 0.85;
    ctx.fillText(subtitle.toUpperCase(), 256, 94);

    const tex = finalizeColorTexture(c, aniso);
    signTextures.set(key, tex);
    allTextures.push(tex);
    return tex;
  };

  return {
    armorSteel,
    komatsuYellow,
    trackBelt,
    asphaltRoad,
    crossRoad,
    brickWall,
    sandstoneWall,
    woodSiding,
    barnWood,
    corrugatedMetal,
    concreteWall,
    roofShingles,
    contactShadow,
    groundDirt,
    signTextures,
    getSignTexture,
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
      signTextures.clear();
    },
  };
}
