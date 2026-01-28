
import React, { useEffect, useRef } from 'react';
import { MeasurementConfig } from '../types';
import { audioEngine } from '../services/AudioEngine';

interface SpectrogramProps {
  config: MeasurementConfig;
  isActive: boolean;
}

const SpectrogramDisplay: React.FC<SpectrogramProps> = ({ config, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Canvas temporal para scroll eficiente
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');

    const render = () => {
      if (isActive) {
        const data = audioEngine.getProcessedData('none', 'None');
        if (data.length > 0) {
          // 1. Mover imagen actual hacia abajo
          tCtx?.drawImage(canvas, 0, 0);
          ctx.drawImage(tempCanvas, 0, 1);

          // 2. Dibujar nueva línea en el tope (y=0)
          const imgData = ctx.createImageData(canvas.width, 1);
          for (let x = 0; x < canvas.width; x++) {
            const freq = Math.pow(10, (x / canvas.width) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
            const binIndex = Math.floor((freq * 4096) / 48000);
            const val = data[binIndex] || -100;
            
            // Mapeo de color: Azul (-90) -> Cyan -> Verde -> Amarillo -> Rojo (0)
            const norm = Math.min(1, Math.max(0, (val + 90) / 90));
            const r = norm > 0.5 ? 255 * (norm - 0.5) * 2 : 0;
            const g = norm < 0.5 ? 255 * norm * 2 : 255 * (1 - (norm - 0.5) * 2);
            const b = norm < 0.5 ? 255 * (1 - norm * 2) : 0;

            const i = x * 4;
            imgData.data[i] = r;
            imgData.data[i+1] = g;
            imgData.data[i+2] = b;
            imgData.data[i+3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive]);

  return (
    <div className="h-32 bg-slate-950 border border-white/5 rounded-xl overflow-hidden relative">
      <canvas ref={canvasRef} width={1024} height={256} className="w-full h-full object-fill" />
      <div className="absolute top-1 right-2 text-[8px] font-bold text-white/20 uppercase tracking-widest pointer-events-none">
        Waterfall / Spectrogram
      </div>
    </div>
  );
};

export default SpectrogramDisplay;
