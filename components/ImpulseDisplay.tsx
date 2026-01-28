
import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../constants';
import { audioEngine } from '../services/AudioEngine';
import { Timer, Ruler, Waves, Target, Info, ArrowDown } from 'lucide-react';

const ImpulseDisplay: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [timeWindow, setTimeWindow] = useState(100); 
  const [showETC, setShowETC] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      const impulse = audioEngine.lastImpulseResponse;
      const envelope = audioEngine.lastEnvelope;

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // Grid de fondo
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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
        const samplesToShow = (timeWindow / 1000) * 48000;

        // 1. Dibujar Impulso RAW (Fondo)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < Math.min(impulse.length, samplesToShow); i++) {
          const x = (i / samplesToShow) * width;
          const db = 20 * Math.log10(Math.max(1e-4, impulse[i]));
          const y = (db / -60) * height;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 2. Dibujar ETC (Envelope Time Curve)
        if (showETC && envelope.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = COLORS.primary;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';
          
          for (let i = 0; i < Math.min(envelope.length, samplesToShow); i++) {
            const x = (i / samplesToShow) * width;
            const db = 20 * Math.log10(Math.max(1e-4, envelope[i]));
            const y = (db / -60) * height;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 3. Peak Marker (Direct Sound)
        const peakSamples = audioEngine.currentDelaySamples;
        const peakX = (peakSamples / samplesToShow) * width;
        if (peakX < width) {
          ctx.strokeStyle = COLORS.warning;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath(); 
          ctx.moveTo(peakX, 0); 
          ctx.lineTo(peakX, height); 
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Etiqueta de llegada directa
          ctx.fillStyle = COLORS.warning;
          ctx.font = 'bold 9px mono';
          ctx.fillText('DIRECT ARRIVAL', peakX + 5, 20);
        }
      } else if (isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '700 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('STANDBY: PRESS "D" TO CAPTURE IMPULSE RESPONSE', width / 2, height / 2);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [timeWindow, showETC, isActive]);

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
      {/* Header de Control y Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 shrink-0">
        
        {/* Selector de Ventana */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time Window</span>
            <Timer size={14} className="text-cyan-400" />
          </div>
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {[100, 250, 500, 1000].map(ms => (
              <button 
                key={ms} 
                onClick={() => setTimeWindow(ms)} 
                className={`flex-1 py-2 rounded-lg text-[10px] mono transition-all ${timeWindow === ms ? 'bg-cyan-500 text-black font-bold' : 'text-slate-500 hover:text-white'}`}
              >
                {ms}ms
              </button>
            ))}
          </div>
        </div>

        {/* Métricas Acústicas (C80/D50) */}
        <div className="lg:col-span-2 bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md grid grid-cols-2 gap-4">
           {audioEngine.acousticMetrics ? (
             <>
               <div className="flex flex-col justify-center gap-1 border-r border-white/5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-500 uppercase">C80 Clarity</span>
                    <Info size={10} className="text-slate-600" title="Claridad para música (>0dB es bueno)"/>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white mono">{audioEngine.acousticMetrics.c80}</span>
                    <span className="text-[10px] text-slate-500 mono">dB</span>
                  </div>
               </div>
               <div className="flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-cyan-400 uppercase">D50 Definition</span>
                    <Info size={10} className="text-slate-600" title="Definición de voz (>50% es inteligible)"/>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white mono">{audioEngine.acousticMetrics.d50}</span>
                    <span className="text-[10px] text-slate-500 mono">%</span>
                  </div>
               </div>
             </>
           ) : (
             <div className="col-span-2 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
               Waiting for data...
             </div>
           )}
        </div>

        {/* RT60 Schroeder */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col justify-center">
          {audioEngine.acousticMetrics?.rt60 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-emerald-500/60 uppercase">T20 (Mid)</span>
                <span className="text-xs font-black text-white mono">{audioEngine.acousticMetrics.rt60.t20.toFixed(2)}s</span>
              </div>
              <div className="h-1 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/40" style={{ width: `${Math.min(100, (audioEngine.acousticMetrics.rt60.t20 / 2) * 100)}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-emerald-500/60 uppercase">T30 (Reverb)</span>
                <span className="text-xs font-black text-white mono">{audioEngine.acousticMetrics.rt60.t30.toFixed(2)}s</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
               <Waves size={16} className="mx-auto mb-2 text-slate-700" />
               <span className="text-[9px] font-bold text-slate-600 uppercase">RT60 Analysis</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-inner">
        <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-fill" />
        
        {/* Eje Y (dB) */}
        <div className="absolute left-4 top-0 h-full flex flex-col justify-between py-6 text-[9px] mono text-slate-600 font-bold pointer-events-none z-10">
          <span className="text-cyan-400">0 dB</span>
          <span>-10</span><span>-20</span><span>-30</span><span>-40</span><span>-50</span>
          <span className="text-slate-800">-60 dB</span>
        </div>

        {/* Eje X (Distancia/Tiempo) */}
        <div className="absolute bottom-4 left-0 w-full px-12 flex justify-between text-[9px] mono text-slate-600 font-bold pointer-events-none z-10">
           {Array.from({length: 11}).map((_, i) => (
             <div key={i} className="flex flex-col items-center">
               <div className="w-px h-2 bg-white/5 mb-1" />
               <span>{((i/10) * timeWindow).toFixed(0)}ms</span>
               <span className="text-[7px] text-slate-700 opacity-60">
                 {(((i/10) * timeWindow) * 0.343).toFixed(1)}m
               </span>
             </div>
           ))}
        </div>

        {/* Controles Flotantes */}
        <div className="absolute top-4 right-6 flex gap-2">
           <button 
             onClick={() => setShowETC(!showETC)}
             className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${showETC ? 'bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
           >
             ETC Envelope
           </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest px-2">
         <ArrowDown size={12} className="text-cyan-400" />
         <span>Identification of early reflections is critical for speaker alignment and acoustic treatment.</span>
         <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-cyan-400/20"/> RAW IR</span>
            <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-cyan-400"/> ETC ENVELOPE</span>
         </div>
      </div>
    </div>
  );
};

export default ImpulseDisplay;
