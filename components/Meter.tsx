
import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/AudioEngine';
import { Activity } from 'lucide-react';

const Meter: React.FC = () => {
  const [levels, setLevels] = useState({ ref: -100, meas: -100 });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      setLevels({
        ref: audioEngine.getPeakLevel(true),
        meas: audioEngine.getPeakLevel(false)
      });
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const getPercent = (val: number) => Math.min(100, Math.max(0, (val + 90) / 90 * 100));

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-px bg-white/10"></div>
       <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
          <Activity size={14} className="text-white/40" />
          Input Levels
        </h3>
      </div>

      <div className="space-y-4">
        {/* Meas Meter */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] mono uppercase font-black">
            <span className="text-cyan-400">Ch-2 Measurement</span>
            <span className={levels.meas > -3 ? 'text-rose-500' : 'text-cyan-400'}>{levels.meas.toFixed(1)} dB</span>
          </div>
          <div className="h-2 bg-black rounded-sm overflow-hidden border border-white/5 relative">
            <div
              className={`h-full transition-all duration-75 ${levels.meas > -3 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'}`}
              style={{ width: `${getPercent(levels.meas)}%` }}
            />
            <div className="absolute inset-0 flex justify-between px-1 opacity-20 pointer-events-none">
               {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="w-px h-full bg-white" />)}
            </div>
          </div>
        </div>

        {/* Ref Meter */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] mono uppercase font-black">
            <span className="text-slate-500">Ch-1 Reference</span>
            <span className="text-slate-400">{levels.ref.toFixed(1)} dB</span>
          </div>
          <div className="h-2 bg-black rounded-sm overflow-hidden border border-white/5 relative">
            <div
              className="h-full bg-white/20 transition-all duration-75"
              style={{ width: `${getPercent(levels.ref)}%` }}
            />
            <div className="absolute inset-0 flex justify-between px-1 opacity-10 pointer-events-none">
               {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="w-px h-full bg-white" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meter;
