
import React, { useEffect, useState } from 'react';
import { Mic, RefreshCw, Radio, AlertTriangle } from 'lucide-react';
import { audioEngine } from '../services/AudioEngine';

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  isStarted?: boolean;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDevice,
  onSelect,
  onRefresh,
  disabled,
  isStarted = false
}) => {
  const [levelL, setLevelL] = useState(-100);
  const [levelR, setLevelR] = useState(-100);
  const [isStereo, setIsStereo] = useState(false);

  // Update level meters when running
  useEffect(() => {
    if (!isStarted) {
      setLevelL(-100);
      setLevelR(-100);
      setIsStereo(false);
      return;
    }

    const interval = setInterval(() => {
      const lRef = audioEngine.getPeakLevel(true);   // Reference (L)
      const lMeas = audioEngine.getPeakLevel(false); // Measurement (R)
      setLevelL(lRef);
      setLevelR(lMeas);
      // Use actual stereo detection from AudioEngine
      setIsStereo(audioEngine.isStereoInput);
    }, 100);

    return () => clearInterval(interval);
  }, [isStarted]);

  // Convert dB to percentage for meter (0 = -60dB, 100 = 0dB)
  const dbToPercent = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));

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

      {/* Dual Channel Routing Info */}
      <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Channel Routing</span>
          {isStarted && (
            <span className={`text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${isStereo ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isStereo ? (
                <><Radio size={10} /> Stereo OK</>
              ) : (
                <><AlertTriangle size={10} /> Mono - TF/Delay disabled</>
              )}
            </span>
          )}
        </div>

        {/* Channel L - Reference */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-cyan-400">L → REFERENCE</span>
            <span className="text-[8px] mono text-slate-500">{levelL > -100 ? `${levelL.toFixed(0)} dB` : '—'}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-100"
              style={{ width: `${dbToPercent(levelL)}%` }}
            />
          </div>
          <span className="text-[7px] text-slate-600">Console output / Matrix send</span>
        </div>

        {/* Channel R - Measurement */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-rose-400">R → MEASUREMENT</span>
            <span className="text-[8px] mono text-slate-500">{levelR > -100 ? `${levelR.toFixed(0)} dB` : '—'}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-100"
              style={{ width: `${dbToPercent(levelR)}%` }}
            />
          </div>
          <span className="text-[7px] text-slate-600">Measurement microphone</span>
        </div>
      </div>

      {/* Setup Instructions */}
      {!isStarted && (
        <div className="text-[8px] text-slate-500 leading-relaxed border-t border-white/5 pt-3">
          <strong className="text-slate-400">Setup:</strong> Connect your audio interface with 2 inputs.
          Route console signal to Input 1 (L) and measurement mic to Input 2 (R).
        </div>
      )}

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
