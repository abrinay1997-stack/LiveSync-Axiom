
import React, { useEffect, useRef, useState } from 'react';
import { MeasurementConfig, TraceData } from '../types';
import { COLORS, LOG_FREQUENCIES } from '../constants';
import { audioEngine } from '../services/AudioEngine';
import { Sliders, ZapOff, Activity } from 'lucide-react';

interface TFDisplayProps {
  config: MeasurementConfig;
  isActive: boolean;
  traces: TraceData[];
}

const TransferDisplay: React.FC<TFDisplayProps> = ({ config, isActive, traces }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  
  // Estados de control de visualización profesional
  const [coherenceThreshold, setCoherenceThreshold] = useState(0.3); // 30% umbral
  const [showBlanked, setShowBlanked] = useState(true);

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

      // --- GRID SYSTEM ---
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      LOG_FREQUENCIES.forEach(f => {
        const x = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      });
      const tfMax = 12; const tfMin = -24;
      for (let db = tfMax; db >= tfMin; db -= 6) {
        const y = (tfMax - db) / (tfMax - tfMin) * magHeight;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      [180, 90, 0, -90, -180].forEach(p => {
        const y = magHeight + (180 - p) / 360 * phaseHeight;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      });
      ctx.stroke();

      const drawTF = (mag: Float32Array, phase: Float32Array, coh: Float32Array, color: string, isLive: boolean) => {
        if (!mag || mag.length === 0) return;

        // 1. Renderizado de Coherencia (Fondo)
        ctx.beginPath();
        ctx.fillStyle = isLive ? 'rgba(251, 146, 60, 0.1)' : 'transparent';
        for (let i = 0; i < coh.length; i++) {
          const freq = (i * 48000) / (coh.length * 2);
          if (freq < 20 || freq > 20000) continue;
          const x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const barH = coh[i] * 30;
          ctx.fillRect(x - 1, magHeight, 2, -barH);
        }

        // 2. Magnitud con COHERENCE BLANKING
        ctx.lineWidth = isLive ? 3 : 2;
        for (let i = 1; i < mag.length; i++) {
          const bins = mag.length;
          const freqPrev = ((i - 1) * 48000) / (bins * 2);
          const freqCurr = (i * 48000) / (bins * 2);
          if (freqCurr < 20 || freqCurr > 20000) continue;

          const x1 = (Math.log10(freqPrev) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const x2 = (Math.log10(freqCurr) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const y1 = (tfMax - mag[i - 1]) / (tfMax - tfMin) * magHeight;
          const y2 = (tfMax - mag[i]) / (tfMax - tfMin) * magHeight;

          // Blanking Logic: Si la coherencia es baja, bajamos el alpha de la línea
          const alpha = coh[i] < coherenceThreshold ? (showBlanked ? 0.05 : 0) : 1;
          
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.globalAlpha = isLive ? alpha : alpha * 0.5;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // 3. Fase
        ctx.lineWidth = 1.2;
        for (let i = 1; i < phase.length; i++) {
          const bins = phase.length;
          const freqPrev = ((i - 1) * 48000) / (bins * 2);
          const freqCurr = (i * 48000) / (bins * 2);
          if (freqCurr < 20 || freqCurr > 20000) continue;

          const x1 = (Math.log10(freqPrev) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const x2 = (Math.log10(freqCurr) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const y1 = magHeight + (180 - phase[i - 1]) / 360 * phaseHeight;
          const y2 = magHeight + (180 - phase[i]) / 360 * phaseHeight;

          if (Math.abs(phase[i] - phase[i-1]) < 270) {
            const alpha = coh[i] < coherenceThreshold ? (showBlanked ? 0.05 : 0) : 0.6;
            ctx.beginPath();
            ctx.strokeStyle = COLORS.phase;
            ctx.globalAlpha = isLive ? alpha : alpha * 0.3;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      };

      // Dibujar trazas estáticas (Snapshots)
      traces.filter(t => t.visible).forEach(t => {
        if (t.phase && t.coherence) {
          drawTF(t.magnitudes, t.phase, t.coherence, t.color, false);
        }
      });

      // Dibujar traza en vivo
      if (isActive) {
        const data = audioEngine.getTransferFunction(config.smoothing);
        drawTF(data.magnitude, data.phase, data.coherence, COLORS.primary, true);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, config, traces, coherenceThreshold, showBlanked]);

  return (
    <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 flex flex-col">
      <div className="flex-1 relative">
        <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-fill" />
        
        {/* Leyendas de Ejes */}
        <div className="absolute right-4 top-0 h-full flex flex-col text-[9px] mono text-slate-600 font-bold pointer-events-none">
           <div className="h-[60%] flex flex-col justify-between py-2 text-right">
             <span>+12 dB</span><span>0 dB</span><span>-12 dB</span><span>-24 dB</span>
           </div>
           <div className="h-[40%] flex flex-col justify-between py-2 text-right border-t border-white/5">
             <span>+180°</span><span>0°</span><span>-180°</span>
           </div>
        </div>

        {/* Coherence Indicator Badge */}
        <div className="absolute bottom-6 left-6 flex items-center gap-3">
           <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Activity size={12} className="text-orange-400" />
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Coherence Threshold</span>
              <input 
                type="range" min="0" max="1" step="0.05" 
                value={coherenceThreshold} 
                onChange={(e) => setCoherenceThreshold(parseFloat(e.target.value))}
                className="w-24 h-1 bg-slate-800 rounded-full appearance-none accent-orange-500"
              />
              <span className="text-[9px] mono text-orange-400 w-8">{(coherenceThreshold * 100).toFixed(0)}%</span>
           </div>
        </div>
      </div>

      {/* Herramientas Profesionales de TF */}
      <div className="h-14 bg-black/40 border-t border-white/5 flex items-center px-6 gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowBlanked(!showBlanked)}
              className={`p-1.5 rounded-lg border transition-all ${showBlanked ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-600'}`}
              title="Toggle Blanking visibility"
            >
              <ZapOff size={14} />
            </button>
            <span className="text-[9px] font-bold text-slate-500 uppercase">Blanking Mode</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-3">
             <span className="text-[9px] font-bold text-slate-500 uppercase">Live Phase Offset</span>
             <div className="flex items-center bg-black/40 rounded-lg border border-white/10 px-2">
                <button onClick={() => {audioEngine.phaseOffsetMs -= 0.1}} className="p-1 text-slate-400 hover:text-white">-</button>
                <span className="text-[10px] mono text-cyan-400 font-bold px-2 w-16 text-center">{audioEngine.phaseOffsetMs.toFixed(2)} ms</span>
                <button onClick={() => {audioEngine.phaseOffsetMs += 0.1}} className="p-1 text-slate-400 hover:text-white">+</button>
             </div>
          </div>
      </div>
    </div>
  );
};

export default TransferDisplay;
