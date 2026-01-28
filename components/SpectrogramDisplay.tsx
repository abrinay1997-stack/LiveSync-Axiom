
import React, { useEffect, useRef } from 'react';
import { MeasurementConfig } from '../types';
import { COLORS } from '../constants';
import { audioEngine } from '../services/AudioEngine';

interface SpectrogramProps {
  config: MeasurementConfig;
  isActive: boolean;
}

const SpectrogramDisplay: React.FC<SpectrogramProps> = ({ config, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  
  const getMagmaColor = (norm: number) => {
    const idx = Math.floor(norm * (COLORS.spectrogram.length - 1));
    return COLORS.spectrogram[idx];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
    const bCtx = bufferCanvas.getContext('2d');

    const render = () => {
      if (isActive && bCtx) {
        // En el espectrograma aplicamos la ganancia visual para resaltar eventos débiles
        const data = audioEngine.getProcessedData('none', 'None', false, config.visualGain);
        if (data.length > 0) {
          bCtx.drawImage(canvas, 0, 0);
          ctx.drawImage(bufferCanvas, 0, 1);

          const lineImgData = ctx.createImageData(canvas.width, 1);
          for (let x = 0; x < canvas.width; x++) {
            const freq = Math.pow(10, (x / canvas.width) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
            const binIndex = Math.floor((freq * 4096) / 48000);
            const val = data[binIndex] || config.minDb;
            
            // Normalizar basado en el rango visual definido en config
            const range = config.maxDb - config.minDb;
            const norm = Math.min(1, Math.max(0, (val - config.minDb) / range));
            const hex = getMagmaColor(norm);
            
            const r = parseInt(hex.slice(1,3), 16);
            const g = parseInt(hex.slice(3,5), 16);
            const b = parseInt(hex.slice(5,7), 16);

            const i = x * 4;
            lineImgData.data[i] = r;
            lineImgData.data[i+1] = g;
            lineImgData.data[i+2] = b;
            lineImgData.data[i+3] = 255;
          }
          ctx.putImageData(lineImgData, 0, 0);
        }
      }
      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, config]);

  return (
    <div className="h-40 bg-slate-950 border border-white/5 rounded-2xl overflow-hidden relative shadow-inner">
      <canvas ref={canvasRef} width={1920} height={400} className="w-full h-full object-fill" />
      <div className="absolute right-3 top-0 h-full flex flex-col justify-between py-2 text-[7px] mono font-bold text-white/10 uppercase pointer-events-none">
        <span>NOW</span><span>-5S</span><span>-10S</span><span>-15S</span>
      </div>
      <div className="absolute bottom-2 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">HD Waterfall Analyzer</span>
      </div>
    </div>
  );
};

export default SpectrogramDisplay;
