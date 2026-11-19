import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GranbyEngine } from './game/GranbyEngine';
import type { CameraMode, GameMode, HudSnapshot, HullStyle, InputState } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  mode: 'mission',
  damageDollars: 0,
  bestScore: 0,
  destroyedCount: 0,
  totalBuildings: 12,
  timeRemaining: 240,
  elapsedTime: 0,
  speedMph: 0,
  engineTemp: 20,
  overheated: false,
  ramming: false,
  combo: 0,
  comboTimer: 0,
  peakCombo: 1,
  nearestTargetName: 'Granby Town Hall',
  nearestTargetDist: 95,
  dozerX: -16,
  dozerZ: 0,
  dozerHeading: -Math.PI * 0.5,
  blips: [],
  latestEvent: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GranbyEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [hullStyle, setHullStyle] = useState<HullStyle>('armored');
  const [muted, setMuted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Mount Three.js engine once inside dedicated empty ref container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    try {
      const engine = new GranbyEngine(
        container,
        (snapshot) => setHud(snapshot),
        (lost) => {
          if (lost) {
            setWebglError('WebGL rendering context was interrupted. Reload to restore 3D graphics.');
          } else {
            setWebglError(null);
          }
        }
      );
      engineRef.current = engine;

      // Enable on-screen drive pad automatically on coarse touch pointers
      if (window.matchMedia('(pointer: coarse)').matches) {
        setShowTouchPad(true);
      }

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch {
      setWebglError('WebGL is unavailable in this browser environment.');
    }
  }, []);

  // Global UI shortcuts (C = camera, M = mute, H = collapse bottom dock)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC' && engineRef.current) {
        const next = engineRef.current.cycleCameraMode();
        setCameraMode(next);
      } else if (e.code === 'KeyM' && engineRef.current) {
        setMuted((prev) => {
          const next = !prev;
          engineRef.current?.setMuted(next);
          return next;
        });
      } else if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStartGame = useCallback((mode: GameMode) => {
    engineRef.current?.startGame(mode);
  }, []);

  const handleReturnTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleCameraChange = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  const handleHullChange = useCallback((style: HullStyle) => {
    setHullStyle(style);
    engineRef.current?.setHullStyle(style);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleHonkHorn = useCallback(() => {
    engineRef.current?.honkHorn();
  }, []);

  const handleTouchControl = useCallback((control: keyof InputState, pressed: boolean) => {
    engineRef.current?.setTouchControl(control, pressed);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#14181e]">
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Graceful fallback if WebGL is unavailable or context is lost */}
      {webglError ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#14181e] p-6">
          <div className="max-w-md bg-[#1c222b] border border-white/12 rounded-lg p-6 text-center">
            <h1 className="font-display text-2xl font-bold text-amber-400">
              Uncle Marvin&apos;s Wacky Kamakazi Komatsu
            </h1>
            <p className="mt-2 text-sm text-slate-300">{webglError}</p>
          </div>
        </div>
      ) : (
        <GameHud
          hud={hud}
          cameraMode={cameraMode}
          hullStyle={hullStyle}
          muted={muted}
          dockCollapsed={dockCollapsed}
          showTouchPad={showTouchPad}
          onStartGame={handleStartGame}
          onReturnTitle={handleReturnTitle}
          onCameraChange={handleCameraChange}
          onHullChange={handleHullChange}
          onToggleMute={handleToggleMute}
          onToggleDock={() => setDockCollapsed((v) => !v)}
          onToggleTouchPad={() => setShowTouchPad((v) => !v)}
          onHonkHorn={handleHonkHorn}
          onTouchControl={handleTouchControl}
        />
      )}
    </main>
  );
}
