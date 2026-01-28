
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
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

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

      const drawTrace = (magnitudes: Float32Array, color: string, isLive: boolean, alpha: number = 1) => {
        if (magnitudes.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isLive ? 3 : 1.5;
        ctx.globalAlpha = alpha;

        let first = true;
        for (let i = 0; i < magnitudes.length; i++) {
          const binFreq = (i * 48000) / 4096;
          if (binFreq < 18 || binFreq > 22000) continue;
          const x = (Math.log10(binFreq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          const y = (config.maxDb - magnitudes[i]) / (config.maxDb - config.minDb) * height;
          if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      traces.filter(t => t.visible).forEach(t => drawTrace(t.magnitudes, t.color, false, 0.4));

      if (isActive) {
        // Dibujamos REFERENCIA (L) en gris/tenue
        const dataRef = audioEngine.getProcessedData(config.smoothing, config.averaging, true);
        drawTrace(dataRef, 'rgba(255, 255, 255, 0.2)', true);
        
        // Dibujamos MEDICIÓN (R) en Cyan brillante
        const dataMeas = audioEngine.getProcessedData(config.smoothing, config.averaging, false);
        drawTrace(dataMeas, COLORS.primary, true);
      }

      if (mousePos.show) {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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
      
      <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex gap-2">
           <div className="px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-bold rounded uppercase">Meas (R)</div>
           <div className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded uppercase">Ref (L)</div>
        </div>
        {mousePos.show && (
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs mono">
            <span className="text-cyan-400 font-bold">{hoverData.freq.toFixed(0)}Hz</span>
            <span className="mx-2 text-slate-500">|</span>
            <span className="text-white">{hoverData.db.toFixed(1)}dB</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RTADisplay;
