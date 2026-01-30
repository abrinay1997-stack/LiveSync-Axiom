
import React, { useRef, useState } from 'react';
import { X, Settings2, Sliders, FileJson, Upload, Trash2, Database, Activity, ShieldCheck, AlertCircle, Loader2, Compass } from 'lucide-react';
import DeviceSelector from './DeviceSelector';
import { TestRunner, TestResult } from '../services/TestRunner';
import { useMeasurement } from '../context/MeasurementContext';

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
  const { config, updateConfig } = useMeasurement();
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    const results = await TestRunner.runAll();
    setTestResults(results);
    setIsRunningTests(false);
  };

  const tldOptions = [0, 1.5, 3, 4.5, 6];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 px-4 overflow-y-auto custom-scrollbar bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      
      <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up my-8" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        
        <div className="p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <Settings2 size={24} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-widest">Axiom Workbench</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">System Configuration & Integrity</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
              <X size={28} />
            </button>
          </div>

          <div className="space-y-10">
            {/* TLD SETTING */}
            <div className="space-y-5 p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-3xl">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Compass size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Target Landscape Distance (TLD)</span>
                </div>
                <span className="text-[10px] mono font-bold text-cyan-400">{config.tld} dB/Oct</span>
              </div>
              
              <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10">
                {tldOptions.map(val => (
                  <button
                    key={val}
                    onClick={() => updateConfig({ tld: val })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${config.tld === val ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {val === 0 ? 'FLAT' : `${val} dB`}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-600 px-2 italic">
                * Adjusts the visual slope to compensate for house curves and pink noise roll-off. Pivot at 1kHz.
              </p>
            </div>

            {/* AUDIO HARDWARE */}
            <div className="space-y-5 pt-4">
              <div className="flex items-center gap-2 px-1">
                <Sliders size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Input Management</span>
              </div>
              <DeviceSelector 
                devices={devices}
                selectedDevice={selectedDevice}
                onSelect={onSelectDevice}
                onRefresh={onRefreshDevices}
                disabled={isEngineStarted}
              />
            </div>
            
            {/* SYSTEM DIAGNOSTICS */}
            <div className="space-y-5 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quality Assurance</span>
                </div>
                <button 
                  onClick={runDiagnostics}
                  disabled={isRunningTests}
                  className="text-[9px] font-black text-cyan-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  {isRunningTests ? <Loader2 size={12} className="animate-spin"/> : <Activity size={12}/>}
                  RUN FULL DIAGNOSTICS
                </button>
              </div>

              {testResults && (
                <div className="grid grid-cols-1 gap-2">
                  {testResults.map((res, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        {res.status === 'passed' ? <ShieldCheck size={14} className="text-emerald-400"/> : <AlertCircle size={14} className="text-rose-500"/>}
                        <span className="text-[10px] font-bold text-slate-300 uppercase">{res.name}</span>
                      </div>
                      <span className={`text-[9px] mono font-bold ${res.status === 'passed' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {res.status === 'passed' ? `PASS (${res.duration.toFixed(2)}ms)` : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SESSION MANAGEMENT */}
            <div className="space-y-5 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 px-1">
                <Database size={14} className="text-purple-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Repository</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={sessionActions.exportSession}
                  disabled={!sessionActions.hasTraces}
                  className="flex items-center justify-center gap-3 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-white hover:bg-white/10 disabled:opacity-30 transition-all uppercase tracking-widest"
                >
                  <FileJson size={16} className="text-purple-400" /> Export JSON
                </button>
                
                <input 
                  type="file" ref={fileInputRef} className="hidden" accept=".json"
                  onChange={(e) => e.target.files?.[0] && sessionActions.importSession(e.target.files[0])}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-3 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  <Upload size={16} className="text-emerald-400" /> Import Session
                </button>
              </div>

              <button 
                onClick={sessionActions.clearAll}
                disabled={!sessionActions.hasTraces}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl text-[10px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white disabled:hidden transition-all uppercase tracking-[0.2em]"
              >
                <Trash2 size={16} /> Clear Environment
              </button>
            </div>

            <div className="pt-10 flex gap-4">
               <button 
                onClick={onClose}
                className="flex-1 py-5 bg-white text-black text-[11px] font-black uppercase tracking-[0.4em] rounded-[1.5rem] hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl shadow-cyan-500/20"
               >
                 Close Settings
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
