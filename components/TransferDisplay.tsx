
import React, { useEffect, useRef } from 'react';
import { MeasurementConfig, TraceData } from '../types';
import { COLORS, LOG_FREQUENCIES } from '../constants';
import { audioEngine } from '../services/AudioEngine';

interface TFDisplayProps {
  config: MeasurementConfig;
  isActive: boolean;
  traces: TraceData[];
}

const TransferDisplay: React.FC<TFDisplayProps> = ({ config, isActive, traces }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      const magHeight = height * 0.6;
      const phaseHeight = height * 0.4;

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      LOG_FREQUENCIES.forEach(f => {
        const x = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      });
      
      const tfMax = 12;
      const tfMin = -24;
      for (let db = tfMax; db >= tfMin; db -= 6) {
        const y = (tfMax - db) / (tfMax - tfMin) * magHeight;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      
      // Phase Grids
      [180, 90, 0, -90, -180].forEach(p => {
        const y = magHeight + (180 - p) / 360 * phaseHeight;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      });
      ctx.stroke();

      const drawTF = (mag: Float32Array, phase: Float32Array, coh: Float32Array, eq: Float32Array | undefined, color: string, isLive: boolean) => {
        if (mag.length === 0) return;

        // 1. Coherence Visualization
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < coh.length; i++) {
          const freq = (i * 48000) / 4096;
          if (freq < 20 || freq > 20000) continue;
          const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const barH = coh[i] * 40;
          ctx.moveTo(x, magHeight); ctx.lineTo(x, magHeight - barH);
        }
        ctx.stroke();

        // 2. Magnitude Curve
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isLive ? 3 : 1.5;
        let firstMag = true;
        for (let i = 0; i < mag.length; i++) {
          const freq = (i * 48000) / 4096;
          if (freq < 20 || freq > 20000) continue;
          const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const y = (tfMax - mag[i]) / (tfMax - tfMin) * magHeight;
          if (firstMag) { ctx.moveTo(x, y); firstMag = false; } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();

        // 3. Correction EQ Curve (Inverse Magnitude)
        if (eq) {
          ctx.beginPath();
          ctx.strokeStyle = '#fb7185'; // Rose 400
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          let firstEq = true;
          for (let i = 0; i < eq.length; i++) {
            const freq = (i * 48000) / 4096;
            if (freq < 20 || freq > 20000) continue;
            const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
            const y = (tfMax - eq[i]) / (tfMax - tfMin) * magHeight;
            if (firstEq) { ctx.moveTo(x, y); firstEq = false; } else { ctx.lineTo(x, y); }
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 4. Phase Curve
        ctx.beginPath();
        ctx.strokeStyle = COLORS.phase;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5;
        let firstPhase = true;
        for (let i = 0; i < phase.length; i++) {
          const freq = (i * 48000) / 4096;
          if (freq < 20 || freq > 20000) continue;
          const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const y = magHeight + (180 - phase[i]) / 360 * phaseHeight;
          if (!firstPhase && Math.abs(phase[i] - phase[i-1]) > 270) {
            ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
          } else if (firstPhase) { ctx.moveTo(x, y); firstPhase = false; } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      if (isActive) {
        const { magnitude, phase, coherence, correctionEq } = audioEngine.getTransferFunction(config.smoothing);
        drawTF(magnitude, phase, coherence, correctionEq, COLORS.primary, true);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, config]);

  return (
    <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
      <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-fill" />
      <div className="absolute top-4 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20 backdrop-blur-sm">Magnitude</div>
          <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-400/10 px-2 py-1 rounded border border-violet-400/20 backdrop-blur-sm">Phase</div>
          <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-400/10 px-2 py-1 rounded border border-rose-400/20 backdrop-blur-sm">Correction EQ</div>
        </div>
      </div>
      <div className="absolute right-4 top-0 h-full flex flex-col text-[9px] mono text-slate-600 font-bold uppercase pointer-events-none">
         <div className="h-[60%] flex flex-col justify-between py-2 text-right">
           <span>+12 dB</span><span>+6 dB</span><span className="text-white/40">0 dB</span><span>-6 dB</span><span>-12 dB</span><span>-18 dB</span><span>-24 dB</span>
         </div>
         <div className="h-[40%] flex flex-col justify-between py-2 text-right border-t border-white/5">
           <span>+180°</span><span>+90°</span><span className="text-violet-400/50">0°</span><span>-90°</span><span>-180°</span>
         </div>
      </div>
    </div>
  );
};

export default TransferDisplay;
