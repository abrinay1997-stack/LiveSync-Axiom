
import React, { useEffect, useRef, useState } from 'react';
import { MeasurementConfig, TraceData, TFData } from '../types';
import { COLORS, LOG_FREQUENCIES } from '../constants';
import { audioEngine } from '../services/AudioEngine';
import { useMeasurement } from '../context/MeasurementContext';
import { ZapOff, Info, Clock, Wand2, PanelRightOpen, PanelRightClose } from 'lucide-react';
import CorrectionPanel from './CorrectionPanel';

interface TFDisplayProps {
  config: MeasurementConfig;
  isActive: boolean;
  traces: TraceData[];
}

const TransferDisplay: React.FC<TFDisplayProps> = ({ config, isActive, traces }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const { updateConfig } = useMeasurement();

  const [coherenceThreshold, setCoherenceThreshold] = useState(0.3);
  const [showBlanked, setShowBlanked] = useState(true);
  const [showCorrectionPanel, setShowCorrectionPanel] = useState(false);
  const [latestTFData, setLatestTFData] = useState<TFData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // DPI awareness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;

    const render = () => {
      const showGD = config.showGroupDelay;
      const magHeight = height * 0.55;
      const secondaryHeight = height * 0.35;
      const cohHeight = height * 0.1;
      const fftSize = config.fftSize;

      // Use configurable dB range from config (same as RTA)
      const tfMax = config.maxDb;
      const tfMin = config.minDb;

      // Group delay display range (ms)
      const gdMax = 50;
      const gdMin = -50;

      // Drive DSP processing
      if (isActive) audioEngine.processFrame();

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // --- GRID SYSTEM ---
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Freq grid (Log)
      LOG_FREQUENCIES.forEach(f => {
        const x = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      });

      // Magnitude grid (dB) - uses configurable range
      const dbStep = 6; // Fixed step for grid lines
      for (let db = tfMax; db >= tfMin; db -= dbStep) {
        const y = (tfMax - db) / (tfMax - tfMin) * magHeight;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }

      if (showGD) {
        // Group delay grid
        for (let ms = gdMin; ms <= gdMax; ms += 10) {
          const y = magHeight + (gdMax - ms) / (gdMax - gdMin) * secondaryHeight;
          ctx.moveTo(0, y); ctx.lineTo(width, y);
        }
      } else {
        // Phase grid
        [180, 90, 0, -90, -180].forEach(p => {
          const y = magHeight + (180 - p) / 360 * secondaryHeight;
          ctx.moveTo(0, y); ctx.lineTo(width, y);
        });
      }
      ctx.stroke();

      const drawTF = (mag: Float32Array, phase: Float32Array, coh: Float32Array, groupDelay: Float32Array | undefined, color: string, isLive: boolean) => {
        if (!mag || mag.length === 0) return;

        // 1. Coherence bars
        if (isLive) {
          for (let i = 0; i < coh.length; i++) {
            const freq = (i * 48000) / fftSize;
            if (freq < 20 || freq > 20000) continue;
            const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
            const barH = coh[i] * cohHeight;
            ctx.fillStyle = coh[i] < coherenceThreshold ? 'rgba(244, 63, 94, 0.4)' : 'rgba(251, 146, 60, 0.6)';
            ctx.fillRect(x - 1, height, 2, -barH);
          }
        }

        // 2. Magnitude curve
        ctx.lineWidth = isLive ? 3 : 2;
        ctx.beginPath();
        let firstMag = true;
        for (let i = 0; i < mag.length; i++) {
          const freq = (i * 48000) / fftSize;
          if (freq < 20 || freq > 20000) continue;

          const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const y = (tfMax - mag[i]) / (tfMax - tfMin) * magHeight;

          const alpha = coh[i] < coherenceThreshold ? (showBlanked ? 0.1 : 0) : (isLive ? 1 : 0.5);
          ctx.globalAlpha = alpha;

          if (firstMag) { ctx.moveTo(x, y); firstMag = false; }
          else { ctx.lineTo(x, y); }
        }
        ctx.strokeStyle = color;
        ctx.stroke();

        // 3. Secondary curve: Group Delay or Phase
        if (showGD && groupDelay && groupDelay.length > 0) {
          // Group delay curve (ms)
          ctx.lineWidth = 2;
          ctx.beginPath();
          let firstGD = true;
          for (let i = 0; i < groupDelay.length; i++) {
            const freq = (i * 48000) / fftSize;
            if (freq < 20 || freq > 20000) continue;

            const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
            const clampedGD = Math.max(gdMin, Math.min(gdMax, groupDelay[i]));
            const y = magHeight + (gdMax - clampedGD) / (gdMax - gdMin) * secondaryHeight;

            const alpha = coh[i] < coherenceThreshold ? (showBlanked ? 0.05 : 0) : (isLive ? 0.8 : 0.3);
            ctx.globalAlpha = alpha;

            if (firstGD) { ctx.moveTo(x, y); firstGD = false; }
            else { ctx.lineTo(x, y); }
          }
          ctx.strokeStyle = '#fb923c'; // orange for group delay
          ctx.stroke();
        } else {
          // Phase curve (uses real unwrapped phase from DSPEngine)
          ctx.lineWidth = 1.5;
          for (let i = 1; i < phase.length; i++) {
            const freqPrev = ((i - 1) * 48000) / fftSize;
            const freqCurr = (i * 48000) / fftSize;
            if (freqCurr < 20 || freqCurr > 20000) continue;

            const x1 = (Math.log10(freqPrev) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
            const x2 = (Math.log10(freqCurr) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;

            // Wrap to +-180 for display
            const p1 = ((phase[i - 1] % 360) + 540) % 360 - 180;
            const p2 = ((phase[i] % 360) + 540) % 360 - 180;

            const y1 = magHeight + (180 - p1) / 360 * secondaryHeight;
            const y2 = magHeight + (180 - p2) / 360 * secondaryHeight;

            if (Math.abs(p2 - p1) < 270) {
              const alpha = coh[i] < coherenceThreshold ? (showBlanked ? 0.05 : 0) : 0.6;
              ctx.beginPath();
              ctx.strokeStyle = COLORS.phase;
              ctx.globalAlpha = isLive ? alpha : alpha * 0.3;
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      };

      // Draw Snapshots
      traces.filter(t => t.visible).forEach(t => {
        if (t.phase && t.coherence) {
          drawTF(t.magnitudes, t.phase, t.coherence, undefined, t.color, false);
        }
      });

      // Draw live TF (use MTW if enabled)
      if (isActive) {
        const data = config.useMTW
          ? audioEngine.getTransferFunctionMTW(config.smoothing)
          : audioEngine.getTransferFunction(config.smoothing);
        drawTF(data.magnitude, data.phase, data.coherence, data.groupDelay, COLORS.primary, true);

        // Store latest TF data for correction panel (throttled)
        if (showCorrectionPanel && data.magnitude.length > 0) {
          setLatestTFData(data);
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, config, traces, coherenceThreshold, showBlanked, showCorrectionPanel]);

  return (
    <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 flex flex-row group">
      {/* Main TF Display */}
      <div className={`flex-1 flex flex-col transition-all ${showCorrectionPanel ? 'mr-0' : ''}`}>
        <div className="flex-1 relative">
          <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />

        {/* Side markers - Dynamic based on config dB range */}
        <div className="absolute right-4 top-0 h-full flex flex-col text-[8px] mono text-slate-500 font-black pointer-events-none z-10">
           {/* Magnitude labels - absolute positioning */}
           <div className="h-[55%] relative text-right">
             {(() => {
               const labels = [];
               const step = 10;
               for (let db = config.maxDb; db >= config.minDb; db -= step) {
                 const pct = ((config.maxDb - db) / (config.maxDb - config.minDb)) * 100;
                 labels.push(
                   <span
                     key={db}
                     className={`absolute right-0 ${db === config.maxDb ? 'text-cyan-400' : db === 0 ? 'text-white' : ''}`}
                     style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}
                   >
                     {db === config.maxDb ? `MAG: ${db > 0 ? '+' : ''}${db}` : db === config.minDb ? `${db} dB` : `${db > 0 ? '+' : ''}${db}`}
                   </span>
                 );
               }
               return labels;
             })()}
           </div>
           {config.showGroupDelay ? (
             <div className="h-[35%] flex flex-col justify-between py-2 text-right border-t border-white/5 bg-black/20">
               <span className="text-orange-400">GD: +50ms</span><span>+30</span><span>+10</span><span className="text-white">0</span><span>-10</span><span>-30</span><span>-50ms</span>
             </div>
           ) : (
             <div className="h-[35%] flex flex-col justify-between py-2 text-right border-t border-white/5 bg-black/20">
               <span className="text-purple-400">PHASE: +180°</span><span>+90°</span><span>0°</span><span>-90°</span><span>-180°</span>
             </div>
           )}
           <div className="h-[10%] flex items-center justify-end text-orange-400">
             <span>COHERENCE</span>
           </div>
        </div>

        {/* Info Overlay */}
        <div className="absolute top-4 left-6 flex items-center gap-4">
           <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/5 flex items-center gap-2">
              <Info size={12} className="text-cyan-400" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                TF: H(f) = Sxy/Sxx | {config.showGroupDelay ? 'Group Delay' : 'Phase'} | Coherence
                {config.useMTW && ' | MTW'}
              </span>
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-14 bg-black/80 border-t border-white/5 flex items-center px-6 gap-8 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-4 border-r border-white/5 pr-8 shrink-0">
            <div className="flex flex-col gap-0.5">
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Coh. Threshold</span>
               <div className="flex items-center gap-3">
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={coherenceThreshold}
                    onChange={(e) => setCoherenceThreshold(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-800 rounded-full appearance-none accent-orange-500"
                  />
                  <span className="text-[10px] mono font-bold text-orange-500">{(coherenceThreshold * 100).toFixed(0)}%</span>
               </div>
            </div>
            <button
              onClick={() => setShowBlanked(!showBlanked)}
              className={`p-2 rounded-lg border transition-all ${showBlanked ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/5 text-slate-600'}`}
              title="Toggle Blanking visibility"
            >
              <ZapOff size={16} />
            </button>
          </div>

          {/* Group Delay Toggle */}
          <div className="flex items-center gap-2 border-r border-white/5 pr-8 shrink-0">
            <button
              onClick={() => updateConfig({ showGroupDelay: !config.showGroupDelay })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${config.showGroupDelay ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-white/5 border-white/5 text-slate-600'}`}
              title="Toggle Group Delay / Phase"
            >
              <Clock size={14} />
              {config.showGroupDelay ? 'GRP DELAY' : 'PHASE'}
            </button>
          </div>

          <div className="flex items-center gap-4 shrink-0">
             <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Manual Alignment (Offset)</span>
                <div className="flex items-center bg-black/60 rounded-lg border border-white/10 px-1 py-1">
                   <button onClick={() => {audioEngine.phaseOffsetMs -= 0.1}} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors">-</button>
                   <div className="px-3 min-w-[80px] text-center">
                      <span className="text-[11px] mono text-cyan-400 font-black">{audioEngine.phaseOffsetMs.toFixed(2)} ms</span>
                   </div>
                   <button onClick={() => {audioEngine.phaseOffsetMs += 0.1}} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors">+</button>
                </div>
             </div>
             <button
               onClick={() => {audioEngine.phaseOffsetMs = 0}}
               className="text-[9px] font-black text-slate-500 hover:text-rose-500 transition-colors uppercase border border-white/5 px-2 py-1 rounded"
             >
               Reset
             </button>
          </div>

          {/* Correction Panel Toggle */}
          <div className="flex items-center gap-2 border-l border-white/5 pl-8 shrink-0">
            <button
              onClick={() => setShowCorrectionPanel(!showCorrectionPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                showCorrectionPanel
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/20'
              }`}
              title="Toggle Correction Analysis Panel"
            >
              <Wand2 size={14} />
              {showCorrectionPanel ? 'Hide Analysis' : 'EQ / Acoustic'}
              {showCorrectionPanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>
      </div>
      </div>

      {/* Correction Panel Sidebar */}
      {showCorrectionPanel && (
        <div className="w-80 border-l border-white/5 bg-black/40 overflow-y-auto shrink-0">
          <CorrectionPanel
            magnitude={latestTFData?.magnitude || new Float32Array(0)}
            coherence={latestTFData?.coherence || new Float32Array(0)}
            fftSize={config.fftSize}
            isActive={isActive && !!latestTFData}
          />
        </div>
      )}
    </div>
  );
};

export default TransferDisplay;
