
import React, { useRef } from 'react';
import { X, Settings2, Sliders, FileJson, Upload, Trash2, Database } from 'lucide-react';
import DeviceSelector from './DeviceSelector';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onSelectDevice: (id: string) => void;
  onRefreshDevices: () => void;
  isEngineStarted: boolean;
  sessionActions: {
    exportSession: () => void;
    importSession: (file: File) => void;
    clearAll: () => void;
    hasTraces: boolean;
  };
}

const ConfigModal: React.FC<ConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  devices, 
  selectedDevice, 
  onSelectDevice, 
  onRefreshDevices,
  isEngineStarted,
  sessionActions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
        <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <Settings2 size={22} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Workbench Settings</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">I/O Configuration & Session Data</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            {/* AUDIO HARDWARE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Sliders size={12} className="text-cyan-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audio Interface</span>
              </div>
              <DeviceSelector 
                devices={devices}
                selectedDevice={selectedDevice}
                onSelect={onSelectDevice}
                onRefresh={onRefreshDevices}
                disabled={isEngineStarted}
              />
            </div>
            
            {/* SESSION MANAGEMENT */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 px-1">
                <Database size={12} className="text-purple-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Session Management</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={sessionActions.exportSession}
                  disabled={!sessionActions.hasTraces}
                  className="flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white hover:bg-white/10 disabled:opacity-30 transition-all uppercase"
                >
                  <FileJson size={14} className="text-purple-400" /> Export JSON
                </button>
                
                <input 
                  type="file" ref={fileInputRef} className="hidden" accept=".json"
                  onChange={(e) => e.target.files?.[0] && sessionActions.importSession(e.target.files[0])}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white hover:bg-white/10 transition-all uppercase"
                >
                  <Upload size={14} className="text-emerald-400" /> Import Session
                </button>
              </div>

              <button 
                onClick={sessionActions.clearAll}
                disabled={!sessionActions.hasTraces}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white disabled:hidden transition-all uppercase tracking-widest"
              >
                <Trash2 size={14} /> Clear All Snapshots
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 flex gap-4">
               <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-xl shadow-cyan-500/10"
               >
                 Ready
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
