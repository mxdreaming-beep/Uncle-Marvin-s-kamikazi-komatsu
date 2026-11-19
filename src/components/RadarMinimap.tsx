import { useEffect, useRef } from 'react';
import type { RadarBlip } from '../game/types';

interface RadarMinimapProps {
  dozerX: number;
  dozerZ: number;
  dozerHeading: number;
  blips: RadarBlip[];
}

export function RadarMinimap({ dozerX, dozerZ, dozerHeading, blips }: RadarMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = w / 200; // maps [-100, 100] to [0, w]
    const cx = w / 2;
    const cy = h / 2;

    // Background
    ctx.fillStyle = '#15191f';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let g = -80; g <= 80; g += 40) {
      const gx = cx + g * scale;
      const gy = cy + g * scale;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Roads (Agate Ave & Side Streets)
    ctx.fillStyle = '#2d343d';
    // Agate Ave E-W
    ctx.fillRect(0, cy - 8 * scale, w, 16 * scale);
    // Jasper & North Service
    ctx.fillRect(0, cy - 44 * scale - 4 * scale, w, 8 * scale);
    ctx.fillRect(0, cy + 44 * scale - 4 * scale, w, 8 * scale);
    // Cross streets
    [-74, -40, 2, 34, 66].forEach((sx) => {
      ctx.fillRect(cx + sx * scale - 4 * scale, 12, 8 * scale, h - 24);
    });

    // Centerline on Agate Ave
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Buildings
    for (const b of blips) {
      const bx = cx + (b.x - b.w * 0.5) * scale;
      const bz = cy + (b.z - b.d * 0.5) * scale;
      const bw = Math.max(4, b.w * scale);
      const bd = Math.max(4, b.d * scale);

      if (b.destroyed) {
        ctx.fillStyle = 'rgba(110, 118, 129, 0.35)';
      } else if (b.isCooling) {
        ctx.fillStyle = '#38bdf8';
      } else if (b.isExplosive) {
        ctx.fillStyle = '#ef4444';
      } else {
        ctx.fillStyle = '#eab308';
      }
      ctx.fillRect(bx, bz, bw, bd);
    }

    // Komatsu D355A heading arrow
    const px = cx + dozerX * scale;
    const pz = cy + dozerZ * scale;
    ctx.save();
    ctx.translate(px, pz);
    // Heading 0 points -Z (up on radar), positive heading rotates CCW
    ctx.rotate(-dozerHeading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.6, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [dozerX, dozerZ, dozerHeading, blips]);

  return (
    <div className="bg-[#15191f]/90 border border-white/12 rounded-md p-2 shadow-lg">
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-0.5">
        <span className="font-medium text-slate-200">Agate Ave</span>
        <span className="font-mono-tabular">Granby, CO</span>
      </div>
      <canvas
        ref={canvasRef}
        width={124}
        height={124}
        className="block w-[124px] h-[124px] rounded-sm border border-white/10"
      />
    </div>
  );
}
