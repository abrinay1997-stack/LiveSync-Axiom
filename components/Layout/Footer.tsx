
import React, { useEffect, useRef, useState } from 'react';
import { HardDrive, Cpu } from 'lucide-react';

interface FooterProps {
  isStarted: boolean;
}

const Footer: React.FC<FooterProps> = ({ isStarted }) => {
  const [dspLoad, setDspLoad] = useState(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef(performance.now());

  useEffect(() => {
    if (!isStarted) { setDspLoad(0); return; }

    let rafId: number;
    const measure = () => {
      const now = performance.now();
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      frameTimesRef.current.push(dt);
      if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();

      // Average frame time as % of 16.67ms budget
      const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      setDspLoad(Math.min(99, (avg / 16.67) * 100));

      rafId = requestAnimationFrame(measure);
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [isStarted]);

  return (
    <footer className="h-8 bg-black border-t border-white/5 flex items-center justify-between px-8 text-[9px] font-mono text-slate-500 uppercase tracking-wider shrink-0">
      <div className="flex gap-8">
        <span className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px] ${isStarted ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} />
          {isStarted ? 'Signal Locked' : 'Engine Idle'}
        </span>
        <span className="opacity-40">SR: 48.0 kHz</span>
        <span className="opacity-40">Buffer: 4k smp</span>
      </div>
      <div className="flex gap-8 items-center">
        <span className="flex items-center gap-2 text-cyan-400/40 font-bold">
          <Cpu size={10}/>
          DSP Load: {dspLoad.toFixed(1)}%
        </span>
        <span className="flex items-center gap-1.5 opacity-60"><HardDrive size={10}/> Cache: Healthy</span>
      </div>
    </footer>
  );
};

export default Footer;
