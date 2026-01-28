
import React from 'react';
import { Mic, RefreshCw } from 'lucide-react';

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ devices, selectedDevice, onSelect, onRefresh, disabled }) => {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/20"></div>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
          <Mic size={14} className="text-cyan-400" />
          Hardware Input
        </h3>
        <button 
          onClick={onRefresh}
          className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
          title="Refresh hardware"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="relative group">
        <select 
          value={selectedDevice}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-white outline-none focus:border-cyan-500/50 appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-mono transition-all group-hover:border-white/20"
        >
          {devices.length === 0 && <option>Scanning devices...</option>}
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Device [${d.deviceId.slice(0, 8)}]`}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
           <div className="w-1 h-1 bg-current rounded-full" />
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-1">
        <div className={`w-1 h-1 rounded-full ${selectedDevice ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`} />
        <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">
          {selectedDevice ? 'Driver Active' : 'Waiting for Device'}
        </span>
      </div>
    </div>
  );
};

export default DeviceSelector;
