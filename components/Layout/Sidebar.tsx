
import React, { useState } from 'react';
import Meter from '../Meter';
import SignalGenerator from '../SignalGenerator';
import SnapshotManager from '../SnapshotManager';
import { useMeasurement } from '../../context/MeasurementContext';
import { ChevronDown, ChevronRight, Activity, Radio, History } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { 
    traces, captureTrace, deleteTrace, renameTrace, toggleTraceVisibility, audioSystem 
  } = useMeasurement();

  const [openSections, setOpenSections] = useState({
    meters: true,
    generator: true,
    screenshots: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 border-r border-white/5 bg-[#050505] flex flex-col overflow-hidden shrink-0 transition-all shadow-2xl relative z-40">
      
      {/* Meters Section */}
      <div className="flex flex-col border-b border-white/5">
        <button 
          onClick={() => toggleSection('meters')}
          className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Activity size={14} className={openSections.meters ? "text-cyan-400" : "text-slate-600"} />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Input Levels</span>
          </div>
          {openSections.meters ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
        </button>
        {openSections.meters && (
          <div className="p-4 bg-black/20 animate-fade-in">
            <Meter />
          </div>
        )}
      </div>

      {/* Generator Section */}
      <div className="flex flex-col border-b border-white/5">
        <button 
          onClick={() => toggleSection('generator')}
          className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Radio size={14} className={openSections.generator ? "text-emerald-400" : "text-slate-600"} />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Signal Gen</span>
          </div>
          {openSections.generator ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
        </button>
        {openSections.generator && (
          <div className="p-4 bg-black/20 animate-fade-in">
            <SignalGenerator />
          </div>
        )}
      </div>

      {/* Screenshots Section (History) */}
      <div className="flex-1 flex flex-col min-h-0">
        <button 
          onClick={() => toggleSection('screenshots')}
          className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group border-b border-white/5 shrink-0"
        >
          <div className="flex items-center gap-2">
            <History size={14} className={openSections.screenshots ? "text-purple-400" : "text-slate-600"} />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Screenshots</span>
          </div>
          {openSections.screenshots ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
        </button>
        {openSections.screenshots && (
          <div className="flex-1 min-h-0 flex flex-col animate-fade-in bg-black/20">
            <SnapshotManager 
              traces={traces}
              onCapture={captureTrace}
              onDelete={deleteTrace}
              onRename={renameTrace}
              onToggleVisibility={toggleTraceVisibility}
              isEngineStarted={audioSystem.isStarted}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
