
import React from 'react';
import { Layers, Scissors, Eye, EyeOff } from 'lucide-react';
import Meter from '../Meter';
import SignalGenerator from '../SignalGenerator';
import DeviceSelector from '../DeviceSelector';
import Panel from '../Common/Panel';
import { TraceData } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  traces: TraceData[];
  onCapture: () => void;
  onDeleteTrace: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onSelectDevice: (id: string) => void;
  onRefreshDevices: () => void;
  isEngineStarted: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  traces, 
  onCapture, 
  onDeleteTrace, 
  onToggleVisibility,
  devices,
  selectedDevice,
  onSelectDevice,
  onRefreshDevices,
  isEngineStarted
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r border-white/5 bg-[#050505] flex flex-col gap-4 overflow-hidden p-4 shrink-0 transition-all">
      <DeviceSelector 
        devices={devices} 
        selectedDevice={selectedDevice} 
        onSelect={onSelectDevice} 
        onRefresh={onRefreshDevices}
        disabled={isEngineStarted}
      />
      
      <Meter />
      
      <SignalGenerator />
      
      <Panel 
        title="Snapshots" 
        icon={<Layers size={14}/>}
        className="flex-1 flex flex-col bg-black/40"
      >
         <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
            {traces.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group transition-colors hover:border-white/10">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                   <div className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px] shadow-current" style={{ backgroundColor: t.color, color: t.color }} />
                   <span className="text-[10px] mono truncate text-slate-400 group-hover:text-white transition-colors">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onToggleVisibility(t.id)} className="p-1.5 text-slate-600 hover:text-cyan-400">
                    {t.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                  </button>
                  <button onClick={() => onDeleteTrace(t.id)} className="p-1.5 text-slate-600 hover:text-rose-500">
                    <Scissors size={12}/>
                  </button>
                </div>
              </div>
            ))}
            {traces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <Layers size={24} />
                <p className="text-[9px] uppercase font-bold mt-2">No data cached</p>
              </div>
            )}
         </div>
         
         <button 
          onClick={onCapture} 
          disabled={!isEngineStarted}
          className="w-full mt-4 py-3 bg-white text-black disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 hover:bg-slate-200 shrink-0"
         >
           Take Snapshot
         </button>
      </Panel>
    </aside>
  );
};

export default Sidebar;
