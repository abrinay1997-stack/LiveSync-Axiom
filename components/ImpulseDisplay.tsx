
import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../constants';
import { audioEngine } from '../services/AudioEngine';
import { Timer, Ruler, MoveHorizontal, Target, Waves } from 'lucide-react';

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

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for (let db = 0; db >= -60; db -= 10) {
        const y = (db / -60) * height;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (impulse.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 2;
        const samplesToShow = (timeWindow / 1000) * 48000;
        
        for (let i = 0; i < Math.min(impulse.length, samplesToShow); i++) {
          const x = (i / samplesToShow) * width;
          const db = 20 * Math.log10(Math.max(0.001, impulse[i]));
          const y = (db / -60) * height;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const peakSamples = audioEngine.currentDelaySamples;
        const peakX = (peakSamples / samplesToShow) * width;
        if (peakX < width) {
          ctx.setLineDash([8, 4]);
          ctx.strokeStyle = COLORS.warning;
          ctx.beginPath(); ctx.moveTo(peakX, 0); ctx.lineTo(peakX, height); ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '700 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS "D" TO CAPTURE IMPULSE & RT60', width / 2, height / 2);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [timeWindow, isActive]);

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-cyan-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Span</span>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 ml-2">
              {[100, 200, 500, 1000].map(ms => (
                <button key={ms} onClick={() => setTimeWindow(ms)} className={`px-3 py-1 rounded text-[10px] font-mono ${timeWindow === ms ? 'bg-cyan-500 text-black font-bold' : 'text-slate-500'}`}>{ms}ms</button>
              ))}
            </div>
          </div>
          
          {audioEngine.rt60 && (
            <div className="flex items-center gap-4 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/20 animate-in zoom-in-95 duration-300">
               <Waves size={14} className="text-emerald-400" />
               <div className="flex gap-4">
                 <div className="flex flex-col">
                    <span className="text-[8px] text-emerald-500/60 font-bold uppercase">T20 (Mid)</span>
                    <span className="text-xs font-black text-emerald-400 mono">{audioEngine.rt60.t20.toFixed(2)}s</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] text-emerald-500/60 font-bold uppercase">T30 (Reverb)</span>
                    <span className="text-xs font-black text-emerald-400 mono">{audioEngine.rt60.t30.toFixed(2)}s</span>
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/40 border border-white/5 rounded-xl">
           <Ruler size={14} className="text-slate-400" />
           <span className="text-[10px] font-bold text-slate-400 uppercase">Analysis FS: 48kHz</span>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group">
        <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-fill" />
        <div className="absolute left-4 top-0 h-full flex flex-col justify-between py-4 text-[9px] mono text-slate-500 font-bold pointer-events-none">
          <span className="text-cyan-400">0 dB</span>
          <span>-20 dB</span>
          <span>-40 dB</span>
          <span className="text-slate-700">-60 dB</span>
        </div>
      </div>
    </div>
  );
};

export default ImpulseDisplay;
