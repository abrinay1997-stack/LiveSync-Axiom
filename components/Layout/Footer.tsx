
import React from 'react';
import { HardDrive } from 'lucide-react';

interface FooterProps {
  isStarted: boolean;
}

const Footer: React.FC<FooterProps> = ({ isStarted }) => {
  return (
    <footer className="h-6 bg-black border-t border-white/5 flex items-center justify-between px-6 text-[9px] font-mono text-slate-600 uppercase shrink-0">
      <div className="flex gap-6">
        <span className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px] ${isStarted ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} /> 
          {isStarted ? 'Clock Sync Locked' : 'Engine Idle'}
        </span>
        <span>Buffer: 4096 smp</span>
        <span>Sample Rate: 48.0 kHz</span>
      </div>
      <div className="flex gap-6 items-center">
        <span className="text-cyan-400/40">DSP Load: {(Math.random() * 3 + 1).toFixed(1)}%</span>
        <span className="flex items-center gap-1"><HardDrive size={10}/> Data Cache: OK</span>
      </div>
    </footer>
  );
};

export default Footer;
