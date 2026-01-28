
import React, { useEffect, useRef, useState } from 'react';
import { MeasurementConfig, TraceData } from '../types';
import { COLORS, LOG_FREQUENCIES } from '../constants';
import { audioEngine } from '../services/AudioEngine';

interface RTADisplayProps {
  config: MeasurementConfig;
  isActive: boolean;
  traces: TraceData[];
}

const RTADisplay: React.FC<RTADisplayProps> = ({ config, isActive, traces }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, show: false });
  const [hoverData, setHoverData] = useState({ freq: 0, db: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    setMousePos({ x, y, show: true });
    const freq = Math.pow(10, (x / canvas.width) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
    const db = config.maxDb - (y / canvas.height) * (config.maxDb - config.minDb);
    setHoverData({ freq, db });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      
      // Fondo
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // 1. Grid Lineas ISO (Pre-calculadas idealmente, aquí optimizadas)
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      LOG_FREQUENCIES.forEach(f => {
        const x = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      });
      for (let db = config.maxDb; db >= config.minDb; db -= 10) {
        const y = (config.maxDb - db) / (config.maxDb - config.minDb) * height;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();

      const drawTrace = (magnitudes: Float32Array, color: string, isLive: boolean) => {
        if (magnitudes.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isLive ? 4 : 2;
        ctx.globalAlpha = isLive ? 1 : 0.5;

        let first = true;
        const step = magnitudes.length > 2048 ? 2 : 1; // Optimizamos dibujo si hay muchos bins
        for (let i = 0; i < magnitudes.length; i += step) {
          const binFreq = (i * 48000) / 4096;
          if (binFreq < 18 || binFreq > 22000) continue;
          
          const x = (Math.log10(binFreq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const val = magnitudes[i];
          const y = (config.maxDb - val) / (config.maxDb - config.minDb) * height;
          
          if (first) { ctx.moveTo(x, y); first = false; } 
          else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // 2. Trazas capturadas
      traces.filter(t => t.visible).forEach(t => drawTrace(t.magnitudes, t.color, false));

      // 3. Traza en Vivo con Pipeline de AudioEngine
      if (isActive) {
        const processed = audioEngine.getProcessedData(config.smoothing, config.averaging);
        drawTrace(processed, COLORS.primary, true);
      }

      // 4. Crosshair
      if (mousePos.show) {
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, height);
        ctx.moveTo(0, mousePos.y); ctx.lineTo(width, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [config, isActive, traces, mousePos]);

  return (
    <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group cursor-crosshair">
      <canvas 
        ref={canvasRef} 
        width={1920} 
        height={1080} 
        className="w-full h-full object-fill"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(prev => ({ ...prev, show: false }))}
      />
      
      <div className="absolute top-8 left-8 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`px-3 py-1 text-black text-xs font-black rounded uppercase tracking-widest transition-colors ${config.averaging !== 'None' ? 'bg-amber-400' : 'bg-cyan-500'}`}>
              {config.averaging !== 'None' ? `${config.averaging} AVG ACTIVE` : 'LIVE RTA'}
            </div>
            <span className="text-xs font-mono text-slate-500 bg-black/50 px-2 py-1 rounded">
              FFT 4096 / {config.smoothing.toUpperCase()}
            </span>
          </div>
          
          {mousePos.show && (
            <div className="flex gap-2">
               <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                 <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-tighter">Frequency</span>
                 <span className="text-2xl font-black text-white mono">{hoverData.freq > 1000 ? (hoverData.freq/1000).toFixed(2) + 'k' : Math.round(hoverData.freq)} <span className="text-sm text-slate-500 font-normal">Hz</span></span>
               </div>
               <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                 <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-tighter">Magnitude</span>
                 <span className="text-2xl font-black text-rose-400 mono">{hoverData.db.toFixed(1)} <span className="text-sm text-slate-500 font-normal">dB</span></span>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RTADisplay;
