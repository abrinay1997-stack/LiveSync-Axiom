
import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/AudioEngine';

const Meter: React.FC = () => {
  const [levels, setLevels] = useState({ ref: -100, meas: -100 });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const aRef = audioEngine.getRefAnalyzer();
      const aMeas = audioEngine.getAnalyzer();

      const getLevel = (analyzer: AnalyserNode | null) => {
        if (!analyzer) return -100;
        const data = new Float32Array(analyzer.frequencyBinCount);
        analyzer.getFloatFrequencyData(data);
        let sum = 0;
        for(let i=0; i<data.length; i++) sum += data[i];
        return sum / data.length;
      };

      setLevels({
        ref: getLevel(aRef),
        meas: getLevel(aMeas)
      });
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const getPercent = (val: number) => Math.min(100, Math.max(0, (val + 100) / 100 * 100));

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 backdrop-blur-md">
       <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Gain (Dual)</h3>
      </div>

      <div className="space-y-2">
        {/* Meas Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] mono text-cyan-400 uppercase">
            <span>Ch-2 Meas</span>
            <span>{levels.meas.toFixed(1)} dB</span>
          </div>
          <div className="h-2 bg-black rounded overflow-hidden border border-white/5">
            <div 
              className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-75"
              style={{ width: `${getPercent(levels.meas)}%` }}
            />
          </div>
        </div>

        {/* Ref Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] mono text-slate-500 uppercase">
            <span>Ch-1 Ref</span>
            <span>{levels.ref.toFixed(1)} dB</span>
          </div>
          <div className="h-2 bg-black rounded overflow-hidden border border-white/5">
            <div 
              className="h-full bg-white/20 transition-all duration-75"
              style={{ width: `${getPercent(levels.ref)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meter;
