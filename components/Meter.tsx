
import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/AudioEngine';

const Meter: React.FC = () => {
  const [level, setLevel] = useState(-100);
  const [peak, setPeak] = useState(-100);
  // Fix: Initialize useRef with undefined to fix "Expected 1 arguments, but got 0" TypeScript error
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const analyzer = audioEngine.getAnalyzer();
      if (analyzer) {
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyzer.getFloatFrequencyData(dataArray);

        // Average level calculation
        let sum = 0;
        let p = -100;
        for(let i=0; i<bufferLength; i++) {
          sum += dataArray[i];
          if(dataArray[i] > p) p = dataArray[i];
        }
        const avg = sum / bufferLength;
        
        setLevel(avg);
        setPeak(prev => Math.max(prev, p));
      }
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const getPercent = (val: number) => {
    return Math.min(100, Math.max(0, (val + 100) / 100 * 100));
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 backdrop-blur-md">
       <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inp-1 Meter</h3>
        <span className="text-xs mono text-cyan-400">{level.toFixed(1)} dB</span>
      </div>

      <div className="relative h-6 bg-slate-950 rounded-lg overflow-hidden border border-white/5">
        <div 
          className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500 via-yellow-500 to-rose-500 transition-all duration-75"
          style={{ width: `${getPercent(level)}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300"
          style={{ left: `${getPercent(peak)}%` }}
        />
        
        {/* Gradients/Scale marks */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
          {[0, 20, 40, 60, 80, 100].map(v => (
            <div key={v} className="w-px h-full bg-white" />
          ))}
        </div>
      </div>
      
      <div className="flex justify-between text-[8px] mono text-slate-500 px-1 uppercase">
        <span>-100</span>
        <span>-60</span>
        <span>-30</span>
        <span>-10</span>
        <span className="text-rose-500">0dB</span>
      </div>
    </div>
  );
};

export default Meter;
