
import React from 'react';
import { Layers, Scissors, Eye, EyeOff, Mic, Settings2 } from 'lucide-react';
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
    <aside className="w-64 border-r border-white/5 bg-slate-950 flex flex-col gap-3 overflow-hidden p-3 shrink-0 transition-all">
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
        icon={<Layers size={12}/>}
        className="flex-1 flex flex-col"
      >
         <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-0">
            {traces.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-white/5 group">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                   <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.color }} />
                   <span className="text-[10px] mono truncate text-slate-400 group-hover:text-white transition-colors">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onToggleVisibility(t.id)} className="p-1 text-slate-600 hover:text-cyan-400">
                    {t.visible ? <Eye size={10}/> : <EyeOff size={10}/>}
                  </button>
                  <button onClick={() => onDeleteTrace(t.id)} className="p-1 text-slate-600 hover:text-rose-500">
                    <Scissors size={10}/>
                  </button>
                </div>
              </div>
            ))}
            {traces.length === 0 && (
              <p className="text-[9px] text-slate-600 text-center italic py-4">No snapshots</p>
            )}
         </div>
         
         <button 
          onClick={onCapture} 
          disabled={!isEngineStarted}
          className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold uppercase rounded-lg border border-white/10 transition-all active:scale-95 shrink-0"
         >
           Take Snapshot
         </button>
      </Panel>
    </aside>
  );
};

export default Sidebar;
