
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
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Mic size={12} className="text-cyan-400" />
          Hardware Input
        </h3>
        <button 
          onClick={onRefresh}
          className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-cyan-400 transition-colors"
          title="Refresh devices"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <select 
        value={selectedDevice}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-slate-300 outline-none focus:border-cyan-500/50 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-mono"
      >
        {devices.length === 0 && <option>No devices found</option>}
        {devices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Device ${d.deviceId.slice(0, 5)}...`}
          </option>
        ))}
      </select>
      
      <div className="flex items-center gap-2 px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${selectedDevice ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`} />
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">
          {selectedDevice ? 'Driver Ready' : 'Select Interface'}
        </span>
      </div>
    </div>
  );
};

export default DeviceSelector;
