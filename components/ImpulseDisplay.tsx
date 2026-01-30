
import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../constants';
import { audioEngine } from '../services/AudioEngine';
import { Timer, Ruler, ArrowDown, Activity } from 'lucide-react';

const ImpulseDisplay: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [timeWindow, setTimeWindow] = useState(100); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      const impulse = audioEngine.lastImpulseResponse;

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // Grid sutil
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      ctx.stroke();

      if (impulse.length > 0) {
        const samplesToShow = (timeWindow / 1000) * 48000;

        // Dibujar la curva ETC (Envelope Time Curve) en dB
        ctx.beginPath();
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < Math.min(impulse.length, samplesToShow); i++) {
          const x = (i / samplesToShow) * width;
          // Escala logarítmica de energía (0 a -60dB)
          const db = 20 * Math.log10(Math.max(1e-4, Math.abs(impulse[i])));
          const y = (db / -60) * height; // 0dB arriba, -60dB abajo
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Marcador de Pico Principal
        const peakSamples = audioEngine.currentDelaySamples;
        const peakX = (peakSamples / samplesToShow) * width;
        if (peakX < width) {
          ctx.strokeStyle = COLORS.warning;
          ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.moveTo(peakX, 0); ctx.lineTo(peakX, height); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = COLORS.warning;
          ctx.font = 'bold 10px mono';
          ctx.fillText(`LLEGADA DIRECTA`, peakX + 5, 20);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '700 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('WAITING FOR IMPULSE CAPTURE (PRESS "D")', width / 2, height / 2);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [timeWindow, isActive]);

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeline</span><Timer size={14} className="text-cyan-400" /></div>
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {[50, 100, 250, 500].map(ms => (
              <button key={ms} onClick={() => setTimeWindow(ms)} className={`flex-1 py-1.5 rounded-lg text-[9px] mono transition-all ${timeWindow === ms ? 'bg-cyan-500 text-black font-bold' : 'text-slate-500'}`}>{ms}ms</button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md grid grid-cols-2 gap-4">
           {audioEngine.acousticMetrics ? (
             <>
               <div className="flex flex-col justify-center border-r border-white/5"><span className="text-[9px] font-black text-emerald-500 uppercase">Clarity C80</span><div className="flex items-baseline gap-2"><span className="text-xl font-black text-white mono">{audioEngine.acousticMetrics.c80}</span><span className="text-[9px] text-slate-500 mono">dB</span></div></div>
               <div className="flex flex-col justify-center"><span className="text-[9px] font-black text-cyan-400 uppercase">Definition D50</span><div className="flex items-baseline gap-2"><span className="text-xl font-black text-white mono">{audioEngine.acousticMetrics.d50}</span><span className="text-[9px] text-slate-500 mono">%</span></div></div>
             </>
           ) : (
             <div className="col-span-2 flex items-center justify-center text-[9px] font-bold text-slate-600 uppercase italic">No impulse data. Use "D" with Pink Noise or Sweep.</div>
           )}
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md flex items-center justify-center gap-3">
           <Ruler size={16} className="text-emerald-500" /><div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase">Acoustic Distance</span><span className="text-xs font-black text-white mono">{audioEngine.currentDelaySamples > 0 ? `${((audioEngine.currentDelaySamples/48000)*343).toFixed(2)} m` : '---'}</span></div>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-inner">
        <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-fill" />
        <div className="absolute left-4 top-0 h-full flex flex-col justify-between py-6 text-[8px] mono text-slate-700 font-bold pointer-events-none"><span>0 dB</span><span>-10</span><span>-20</span><span>-30</span><span>-40</span><span>-50</span><span>-60 dB</span></div>
        <div className="absolute bottom-4 left-0 w-full px-12 flex justify-between text-[8px] mono text-slate-700 font-bold pointer-events-none">{Array.from({length: 6}).map((_, i) => (<span key={i}>{((i/5) * timeWindow).toFixed(0)}ms</span>))}</div>
      </div>

      <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest px-2"><ArrowDown size={12} className="text-cyan-400" /><span>The peak indicates the direct sound. Secondary peaks show room reflections and boundary echoes.</span></div>
    </div>
  );
};

export default ImpulseDisplay;
