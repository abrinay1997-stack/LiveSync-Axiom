
import React, { useEffect, useRef, useState } from 'react';
import { MeasurementConfig, TraceData } from '../types';
import { COLORS, LOG_FREQUENCIES, NOTE_FREQS } from '../constants';
import { audioEngine } from '../services/AudioEngine';

interface RTADisplayProps {
  config: MeasurementConfig;
  isActive: boolean;
  traces: TraceData[];
}

const RTADisplay: React.FC<RTADisplayProps> = ({ config, isActive, traces }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [hoverData, setHoverData] = useState({ freq: 0, db: 0, note: '', lambda: 0, show: false });

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    
    const freq = Math.pow(10, (x / canvas.width) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
    
    // El hover debe mostrar el valor compensado para ser consistente con lo que se ve
    const octaves = Math.log2(freq / 1000);
    const tilt = octaves * config.tld;
    const db = config.maxDb - (y / canvas.height) * (config.maxDb - config.minDb);
    
    const noteOctaves = Math.log2(freq / 16.35);
    const noteIdx = Math.round((noteOctaves % 1) * 12) % 12;
    const note = NOTE_FREQS[noteIdx]?.n || '';
    const octaveNum = Math.floor(noteOctaves);

    setHoverData({ freq, db, note: `${note}${octaveNum}`, lambda: 343 / freq, show: true });
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

      // Grid sutil (Vertical - dB)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let db = config.maxDb; db >= config.minDb; db -= 10) {
        const y = (config.maxDb - db) / (config.maxDb - config.minDb) * height;
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      
      // Grid sutil (Horizontal - Freq)
      LOG_FREQUENCIES.forEach(f => {
        const x = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      });
      ctx.stroke();

      const drawTrace = (magnitudes: Float32Array, color: string, isLive: boolean) => {
        if (!magnitudes || magnitudes.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isLive ? 2.5 : 1.5;
        ctx.globalAlpha = isLive ? 1 : 0.6;

        let first = true;
        const totalBins = magnitudes.length;
        
        for (let i = 0; i < totalBins; i++) {
          const binFreq = (i * 48000) / (totalBins * 2);
          if (binFreq < 18 || binFreq > 22000) continue;
          
          const x = (Math.log10(binFreq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * width;
          
          // Aplicamos TLD (Inclinación de Paisaje)
          // El pivote es 1000 Hz
          const octaves = Math.log2(binFreq / 1000);
          const tilt = octaves * config.tld;
          
          const magValue = magnitudes[i] + config.visualGain + tilt;
          const y = (config.maxDb - magValue) / (config.maxDb - config.minDb) * height;
          
          if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // 1. Dibujar Snapshots
      traces.filter(t => t.visible).forEach(t => {
        drawTrace(t.magnitudes, t.color, false);
      });

      // 2. Dibujar Traza en Vivo
      if (isActive) {
        // Obtenemos datos crudos y aplicamos TLD en el renderizado
        const dataMeas = audioEngine.getProcessedData(config.smoothing, config.averaging, false, 0);
        drawTrace(dataMeas, COLORS.primary, true);
      }
      
      rafRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [config, isActive, traces]);

  const dbLabels = [];
  for (let db = config.maxDb; db >= config.minDb; db -= 10) dbLabels.push(db);

  return (
    <div className="relative flex-1 bg-[#050505] rounded-xl overflow-hidden border border-white/5 flex flex-col group cursor-crosshair">
      <div className="h-10 bg-black/60 border-b border-white/5 flex items-center px-6 justify-between shrink-0">
         <div className="flex gap-6 items-center">
            <div className="flex items-baseline gap-2">
               <span className="text-[8px] font-black text-slate-600 uppercase">Frequency</span>
               <span className="text-xs font-bold text-cyan-400 mono w-20">{hoverData.show ? hoverData.freq.toFixed(0) : '---'} Hz</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-[8px] font-black text-slate-600 uppercase">Magnitude</span>
               <span className="text-xs font-bold text-white mono w-16">{hoverData.show ? hoverData.db.toFixed(1) : '---'} dB</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-[8px] font-black text-slate-600 uppercase">Note</span>
               <span className="text-xs font-bold text-purple-400 mono w-12">{hoverData.show ? hoverData.note : '---'}</span>
            </div>
         </div>
         <div className="flex gap-4 items-center">
            {config.tld !== 0 && (
              <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase">
                TLD: {config.tld} dB/Oct
              </span>
            )}
            {config.visualGain !== 0 && (
              <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                Gain: +{config.visualGain}dB
              </span>
            )}
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">RTA Analyzer</span>
         </div>
      </div>

      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef} 
          width={1920} 
          height={1080} 
          className="w-full h-full object-fill"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(prev => ({ ...prev, show: false }))}
        />
        
        <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-4 text-[8px] mono text-slate-700 font-bold pointer-events-none">
           {dbLabels.map(db => <span key={db}>{db}</span>)}
        </div>
      </div>
    </div>
  );
};

export default RTADisplay;
