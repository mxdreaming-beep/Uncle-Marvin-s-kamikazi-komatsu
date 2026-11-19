import {
  Camera,
  ChevronDown,
  ChevronUp,
  Flame,
  Gamepad2,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CameraMode, GameMode, HudSnapshot, HullStyle, InputState } from '../game/types';
import { RadarMinimap } from './RadarMinimap';

interface GameHudProps {
  hud: HudSnapshot;
  cameraMode: CameraMode;
  hullStyle: HullStyle;
  muted: boolean;
  dockCollapsed: boolean;
  showTouchPad: boolean;
  onStartGame: (mode: GameMode) => void;
  onReturnTitle: () => void;
  onCameraChange: (mode: CameraMode) => void;
  onHullChange: (style: HullStyle) => void;
  onToggleMute: () => void;
  onToggleDock: () => void;
  onToggleTouchPad: () => void;
  onHonkHorn: () => void;
  onTouchControl: (control: keyof InputState, pressed: boolean) => void;
}

function formatMoney(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export function GameHud({
  hud,
  cameraMode,
  hullStyle,
  muted,
  dockCollapsed,
  showTouchPad,
  onStartGame,
  onReturnTitle,
  onCameraChange,
  onHullChange,
  onToggleMute,
  onToggleDock,
  onToggleTouchPad,
  onHonkHorn,
  onTouchControl,
}: GameHudProps) {
  const tempColor =
    hud.overheated || hud.engineTemp >= 85
      ? 'bg-red-500'
      : hud.engineTemp >= 60
        ? 'bg-amber-400'
        : 'bg-emerald-400';

  const tempLabel = hud.overheated
    ? 'Overheated'
    : hud.engineTemp >= 85
      ? 'Hot'
      : 'Normal';

  // 1. TITLE OVERLAY (Floats cleanly over live 3D Granby town + orbiting Komatsu D355A)
  if (hud.phase === 'title') {
    return (
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-6 md:p-10">
        {/* Top brand metadata */}
        <div className="flex items-center justify-between">
          <div className="bg-[#14181e]/90 border border-white/12 rounded-md px-4 py-2 text-xs text-slate-300">
            <span className="font-semibold text-amber-400">Komatsu D355A</span>
            <span className="mx-2 text-slate-500" aria-hidden="true">·</span>
            <span>Granby, Colorado</span>
            <span className="mx-2 text-slate-500" aria-hidden="true">·</span>
            <span>Elev. 7,935 ft</span>
          </div>

          {hud.bestScore > 0 && (
            <div className="bg-[#14181e]/90 border border-white/12 rounded-md px-4 py-2 text-xs text-slate-300 font-mono-tabular">
              Best Damage: <span className="text-amber-400 font-bold">{formatMoney(hud.bestScore)}</span>
            </div>
          )}
        </div>

        {/* Bottom-left hero title card so center 3D bulldozer stays 100% unobstructed */}
        <div className="pointer-events-auto max-w-xl bg-[#14181e]/92 border border-white/12 rounded-lg p-6 md:p-7 shadow-2xl">
          <p className="text-xs font-medium text-amber-400 mb-2">
            Agate Avenue Demolition · 12 Town Landmarks
          </p>
          <h1
            className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.06]"
            style={{ textWrap: 'balance' }}
          >
            Uncle Marvin&apos;s Wacky Kamakazi Komatsu
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Fire up the 410-horsepower Komatsu D355A crawler dozer and level Granby from the Concrete Plant to Town Hall. Smash fire hydrants or the Water Tower to cool an overheated radiator.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStartGame('mission')}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-[#14181e] font-semibold text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Start Mission (4:00)
            </button>
            <button
              type="button"
              onClick={() => onStartGame('freeroam')}
              className="px-5 py-3 bg-[#222831] hover:bg-[#2c3440] text-slate-100 border border-white/14 font-medium text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Free Roam Sandbox
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
            <span><strong className="text-slate-200 font-mono-tabular">WASD / Arrows</strong> Drive &amp; Pivot</span>
            <span aria-hidden="true">·</span>
            <span><strong className="text-slate-200 font-mono-tabular">Space</strong> Turbo Ram</span>
            <span aria-hidden="true">·</span>
            <span><strong className="text-slate-200 font-mono-tabular">C</strong> Camera</span>
            <span aria-hidden="true">·</span>
            <span><strong className="text-slate-200 font-mono-tabular">F</strong> Air Horn</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE PLAY & ENDGAME HUD
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Bar: Minimal Top-Left Telemetry & Top-Right Radar (Center stays 100% clear) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Compact Score & Mission Status */}
        <div className="pointer-events-auto bg-[#14181e]/90 border border-white/12 rounded-md px-4 py-3 shadow-lg min-w-[235px]">
          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-200 truncate max-w-[200px]">
              Uncle Marvin&apos;s Komatsu
            </span>
            {hud.mode === 'mission' ? (
              <span
                className={`font-mono-tabular font-bold ${
                  hud.timeRemaining <= 30 ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {formatClock(hud.timeRemaining)}
              </span>
            ) : (
              <span className="font-mono-tabular text-slate-400">Free Roam</span>
            )}
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-4">
            <div className="font-display text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums leading-none">
              {formatMoney(hud.damageDollars)}
            </div>
            <div className="font-mono-tabular text-xs text-slate-200">
              {hud.destroyedCount}/{hud.totalBuildings} Leveled
            </div>
          </div>

          {/* Nearest standing landmark bearing */}
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-3 text-xs text-slate-300">
            {hud.nearestTargetName ? (
              <>
                <span className="truncate max-w-[165px]">{hud.nearestTargetName}</span>
                <span className="font-mono-tabular text-slate-400 shrink-0">
                  {hud.nearestTargetDist} ft
                </span>
              </>
            ) : (
              <span className="text-emerald-400 font-medium">All Granby landmarks leveled</span>
            )}
          </div>

          {/* Active Combo bar */}
          {hud.combo > 1 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300">
                <span>Demolition Chain</span>
                <span className="font-mono-tabular">x{hud.combo}</span>
              </div>
              <div className="mt-1 h-1 w-full bg-white/10 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-transform duration-75 origin-left"
                  style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.comboTimer))})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center-Top Brief Destruction Toast (non-obstructive) */}
        <div className="hidden md:flex flex-col items-center">
          {hud.latestEvent && (
            <div
              key={hud.latestEvent.id}
              className="bg-[#14181e]/92 border border-amber-400/40 rounded-md px-5 py-2.5 text-center shadow-xl"
            >
              <div className="font-display text-lg font-bold text-white tracking-wide">
                {hud.latestEvent.buildingName} Demolished
              </div>
              <div className="text-xs text-slate-300 font-mono-tabular mt-0.5">
                <span className="text-amber-400 font-bold">+{formatMoney(hud.latestEvent.reward)}</span>
                {hud.latestEvent.combo > 1 && (
                  <>
                    <span className="mx-1.5 text-slate-500" aria-hidden="true">·</span>
                    <span>x{hud.latestEvent.combo} Chain</span>
                  </>
                )}
                {hud.latestEvent.note && (
                  <>
                    <span className="mx-1.5 text-slate-500" aria-hidden="true">·</span>
                    <span className="text-sky-300">{hud.latestEvent.note}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Compact Granby Radar */}
        <div className="pointer-events-auto hidden sm:block">
          <RadarMinimap
            dozerX={hud.dozerX}
            dozerZ={hud.dozerZ}
            dozerHeading={hud.dozerHeading}
            blips={hud.blips}
          />
        </div>
      </div>

      {/* Optional On-Screen Drive Pad (for touchscreens or mouse driving) */}
      {showTouchPad && hud.phase === 'playing' && (
        <div className="pointer-events-none fixed inset-x-4 bottom-24 z-20 flex items-end justify-between">
          {/* Left: Steer Left / Right */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => onTouchControl('left', true)}
              onPointerUp={() => onTouchControl('left', false)}
              onPointerLeave={() => onTouchControl('left', false)}
              className="w-14 h-14 bg-[#14181e]/90 active:bg-amber-400 active:text-[#14181e] border border-white/15 rounded-md font-bold text-lg text-white cursor-pointer"
              aria-label="Turn Left"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchControl('right', true)}
              onPointerUp={() => onTouchControl('right', false)}
              onPointerLeave={() => onTouchControl('right', false)}
              className="w-14 h-14 bg-[#14181e]/90 active:bg-amber-400 active:text-[#14181e] border border-white/15 rounded-md font-bold text-lg text-white cursor-pointer"
              aria-label="Turn Right"
            >
              →
            </button>
          </div>

          {/* Right: Forward / Reverse / Turbo Ram */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => onTouchControl('ram', true)}
              onPointerUp={() => onTouchControl('ram', false)}
              onPointerLeave={() => onTouchControl('ram', false)}
              className="px-4 h-14 bg-amber-400 active:bg-amber-300 text-[#14181e] font-bold text-xs rounded-md cursor-pointer whitespace-nowrap"
            >
              RAM
            </button>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onPointerDown={() => onTouchControl('forward', true)}
                onPointerUp={() => onTouchControl('forward', false)}
                onPointerLeave={() => onTouchControl('forward', false)}
                className="w-14 h-12 bg-[#14181e]/90 active:bg-amber-400 active:text-[#14181e] border border-white/15 rounded-md font-bold text-lg text-white cursor-pointer"
                aria-label="Drive Forward"
              >
                ↑
              </button>
              <button
                type="button"
                onPointerDown={() => onTouchControl('backward', true)}
                onPointerUp={() => onTouchControl('backward', false)}
                onPointerLeave={() => onTouchControl('backward', false)}
                className="w-14 h-12 bg-[#14181e]/90 active:bg-amber-400 active:text-[#14181e] border border-white/15 rounded-md font-bold text-lg text-white cursor-pointer"
                aria-label="Reverse"
              >
                ↓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Center Viewport Occlusion) */}
      <div className="pointer-events-none flex flex-col items-center">
        <button
          type="button"
          onClick={onToggleDock}
          className="pointer-events-auto mb-1.5 px-3 py-1 bg-[#14181e]/90 hover:bg-[#1e242d] border border-white/12 rounded-md text-[11px] font-medium text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        <div
          className={`pointer-events-auto w-full max-w-[940px] bg-[#14181e]/92 border border-white/12 rounded-lg px-4 py-2.5 shadow-2xl transition-transform duration-200 ${
            dockCollapsed ? 'translate-y-[140%] pointer-events-none' : 'translate-y-0'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Speed & Radiator Gauge */}
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[11px] text-slate-400">Speed</div>
                <div className="font-mono-tabular text-sm font-bold text-white">
                  {hud.speedMph} <span className="text-[11px] font-normal text-slate-400">mph</span>
                </div>
              </div>

              <div className="w-36 sm:w-44">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Radiator · {tempLabel}
                  </span>
                  <span className="font-mono-tabular text-slate-200">{hud.engineTemp}%</span>
                </div>
                <div className="mt-1 h-2 w-full bg-white/10 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-transform duration-100 origin-left ${tempColor}`}
                    style={{ transform: `scaleX(${Math.max(0.05, hud.engineTemp / 100)})` }}
                  />
                </div>
              </div>
            </div>

            {/* Camera View Selector */}
            <div className="flex items-center gap-1 bg-[#1e242d] p-1 rounded-md">
              <Camera className="w-3.5 h-3.5 text-slate-400 mx-1.5 shrink-0" />
              {(['chase', 'aerial', 'low', 'cab'] as CameraMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onCameraChange(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer whitespace-nowrap capitalize ${
                    cameraMode === mode
                      ? 'bg-amber-400 text-[#14181e] font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Hull Finish Selector (Armored vs Factory Komatsu D355A) */}
            <div className="flex items-center gap-1 bg-[#1e242d] p-1 rounded-md">
              <Shield className="w-3.5 h-3.5 text-slate-400 mx-1.5 shrink-0" />
              {(['armored', 'factory'] as HullStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onHullChange(style)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer whitespace-nowrap capitalize ${
                    hullStyle === style
                      ? 'bg-slate-100 text-[#14181e] font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onHonkHorn}
                className="px-2.5 py-1.5 bg-[#1e242d] hover:bg-[#2a323e] text-slate-200 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Horn
              </button>
              <button
                type="button"
                onClick={onToggleTouchPad}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  showTouchPad
                    ? 'bg-amber-400 text-[#14181e]'
                    : 'bg-[#1e242d] hover:bg-[#2a323e] text-slate-200'
                }`}
                title="Toggle On-Screen Drive Pad"
                aria-label="Toggle On-Screen Drive Pad"
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 bg-[#1e242d] hover:bg-[#2a323e] text-slate-200 rounded-md transition-colors cursor-pointer"
                title={muted ? 'Unmute Sound' : 'Mute Sound'}
                aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => onStartGame(hud.mode)}
                className="p-1.5 bg-[#1e242d] hover:bg-[#2a323e] text-slate-200 rounded-md transition-colors cursor-pointer"
                title="Reset Granby"
                aria-label="Reset Granby"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Victory / Time-Up Demolition Report Modal */}
      {(hud.phase === 'victory' || hud.phase === 'gameover') && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-md bg-[#14181e] border border-white/15 rounded-lg p-6 shadow-2xl">
            <p className="text-xs font-semibold text-amber-400">
              {hud.phase === 'victory' ? 'Granby Cleared' : 'Town Lockdown Reached'}
            </p>
            <h2 className="font-display text-3xl font-bold text-white mt-1">
              {hud.phase === 'victory'
                ? 'All 12 Landmarks Demolished'
                : 'Demolition Report'}
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-4 py-4 border-y border-white/10">
              <div>
                <div className="text-xs text-slate-400">Total Damage</div>
                <div className="font-display text-2xl font-bold text-amber-400 tabular-nums mt-0.5">
                  {formatMoney(hud.damageDollars)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Best Record</div>
                <div className="font-display text-2xl font-bold text-white tabular-nums mt-0.5">
                  {formatMoney(hud.bestScore)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Structures Leveled</div>
                <div className="font-mono-tabular text-base font-semibold text-slate-100 mt-0.5">
                  {hud.destroyedCount} / {hud.totalBuildings}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Peak Chain · Time</div>
                <div className="font-mono-tabular text-base font-semibold text-slate-100 mt-0.5">
                  x{hud.peakCombo} · {formatClock(hud.elapsedTime)}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onStartGame('mission')}
                className="flex-1 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#14181e] font-semibold text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => onStartGame('freeroam')}
                className="px-4 py-2.5 bg-[#222831] hover:bg-[#2c3440] text-slate-100 border border-white/14 font-medium text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Free Roam
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="px-3 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
