
import React, { useRef, useState } from 'react';
import { X, Settings2, Sliders, FileJson, Upload, Trash2, Database, Activity, ShieldCheck, AlertCircle, Loader2, Compass, Mic, Cpu, Layers } from 'lucide-react';
import DeviceSelector from './DeviceSelector';
import { TestRunner, TestResult } from '../services/TestRunner';
import { useMeasurement } from '../context/MeasurementContext';
import { WindowType, MicCalibration } from '../types';

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

function parseCalFile(text: string, fileName: string): MicCalibration | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('"') && !l.startsWith('*'));
  const freqs: number[] = [];
  const corrections: number[] = [];
  for (const line of lines) {
    const parts = line.split(/[\s\t,]+/);
    if (parts.length >= 2) {
      const f = parseFloat(parts[0]);
      const c = parseFloat(parts[1]);
      if (!isNaN(f) && !isNaN(c) && f > 0) {
        freqs.push(f);
        corrections.push(c);
      }
    }
  }
  if (freqs.length < 2) return null;
  return { name: fileName, freqs, corrections };
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
  const calInputRef = useRef<HTMLInputElement>(null);
  const { config, updateConfig } = useMeasurement();
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    const results = await TestRunner.runAll();
    setTestResults(results);
    setIsRunningTests(false);
  };

  const handleCalFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const cal = parseCalFile(text, file.name);
      if (cal) {
        updateConfig({ micCalibration: cal });
      } else {
        alert('Invalid calibration file. Expected format: frequency(Hz) correction(dB) per line.');
      }
    };
    reader.readAsText(file);
  };

  const tldOptions = [0, 1.5, 3, 4.5, 6];
  const windowOptions: { label: string; value: WindowType }[] = [
    { label: 'Hann', value: 'hann' },
    { label: 'Hamming', value: 'hamming' },
    { label: 'BH4', value: 'blackman-harris' },
    { label: 'Flat-Top', value: 'flattop' },
    { label: 'Rect', value: 'rectangular' },
  ];
  const fftOptions = [1024, 2048, 4096, 8192, 16384];

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
                <h2 className="text-base font-black text-white uppercase tracking-widest">
                  <span className="gradient-pro mr-2">AXIOM</span>
                  Workbench
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">System Configuration & Integrity</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
              <X size={28} />
            </button>
          </div>

          <div className="space-y-10">

            {/* DSP ENGINE SETTINGS */}
            <div className="space-y-5 p-6 bg-purple-500/5 border border-purple-500/10 rounded-3xl">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-purple-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">DSP Engine</span>
                </div>
              </div>

              {/* FFT Size */}
              <div className="space-y-2" title="Tamano de la ventana FFT. Mayor = mas resolucion en bajas frecuencias pero mas latencia">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">FFT Size</span>
                  <span className="text-[9px] mono font-bold text-purple-400">{config.fftSize} pts</span>
                </div>
                <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10">
                  {fftOptions.map(val => (
                    <button
                      key={val}
                      onClick={() => updateConfig({ fftSize: val })}
                      title={`${val} puntos - ${val === 16384 ? 'Maxima resolucion LF' : val === 4096 ? 'Balance recomendado' : val === 1024 ? 'Rapido pero baja res' : ''}`}
                      className={`flex-1 py-2.5 rounded-xl text-[9px] font-black transition-all ${config.fftSize === val ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {val >= 1024 ? `${val / 1024}K` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Window Type */}
              <div className="space-y-2" title="Ventana de analisis. Afecta resolucion espectral y fuga de lóbulos laterales">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 block">Window Function</span>
                <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10">
                  {windowOptions.map(opt => {
                    const tooltips: Record<WindowType, string> = {
                      'hann': 'Hann - Balance general, recomendada para RTA',
                      'hamming': 'Hamming - Similar a Hann, lobulos mas bajos',
                      'blackman-harris': 'BH4 - Maxima separacion de tonos cercanos',
                      'flattop': 'Flat-Top - Precision de amplitud, ideal calibracion',
                      'rectangular': 'Rect - Sin ventana, maxima resolucion pero fuga alta',
                    };
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateConfig({ windowType: opt.value })}
                        title={tooltips[opt.value]}
                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black transition-all ${config.windowType === opt.value ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MTW Toggle */}
              <div className="flex items-center justify-between px-1 py-3 bg-black/40 rounded-xl border border-white/5" title="Combina multiples FFT sizes: alta resolucion en bajas frecuencias, rapida respuesta en altas">
                <div className="flex items-center gap-2 pl-3">
                  <Layers size={14} className="text-purple-400" />
                  <div>
                    <span className="text-[9px] font-black text-white uppercase tracking-widest block">Multi-Time Window (MTW)</span>
                    <span className="text-[8px] text-slate-600">16K/4K/1K merged across bands</span>
                  </div>
                </div>
                <button
                  onClick={() => updateConfig({ useMTW: !config.useMTW })}
                  title={config.useMTW ? 'Desactivar MTW' : 'Activar MTW para mejor resolucion adaptativa'}
                  className={`mr-3 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${config.useMTW ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-500 border-white/10'}`}
                >
                  {config.useMTW ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Averaging */}
              <div className="space-y-2" title="Promediado de espectros para reducir ruido y estabilizar la traza">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Averaging</span>
                  <span className="text-[9px] mono font-bold text-purple-400">{config.averaging} ({config.averagingCount})</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 flex-1">
                    {(['None', 'Exp', 'Lin', 'Inf'] as const).map(avg => {
                      const avgTooltips: Record<string, string> = {
                        'None': 'Sin promediado - respuesta instantanea',
                        'Exp': 'Exponencial - peso mayor a muestras recientes',
                        'Lin': 'Lineal - promedio simple de N muestras',
                        'Inf': 'Infinito - acumula todo desde el inicio',
                      };
                      return (
                        <button
                          key={avg}
                          onClick={() => updateConfig({ averaging: avg })}
                          title={avgTooltips[avg]}
                          className={`flex-1 py-2.5 rounded-xl text-[9px] font-black transition-all ${config.averaging === avg ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {avg}
                        </button>
                      );
                    })}
                  </div>
                  {(config.averaging === 'Exp' || config.averaging === 'Lin') && (
                    <div className="flex items-center bg-black/60 rounded-2xl border border-white/10 px-3" title="Numero de muestras a promediar">
                      <input
                        type="number" min="2" max="64" value={config.averagingCount}
                        onChange={(e) => updateConfig({ averagingCount: Math.max(2, parseInt(e.target.value) || 8) })}
                        className="bg-transparent text-[10px] mono text-purple-400 font-bold w-10 outline-none text-center"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MICROPHONE CALIBRATION */}
            <div className="space-y-5 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Mic size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Microphone Calibration</span>
                </div>
              </div>

              {config.micCalibration ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 block">{config.micCalibration.name}</span>
                      <span className="text-[8px] text-slate-500">{config.micCalibration.freqs.length} correction points</span>
                    </div>
                    <button
                      onClick={() => updateConfig({ micCalibration: null })}
                      className="text-[9px] font-black text-rose-500 hover:text-rose-400 uppercase px-3 py-1.5 border border-rose-500/20 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file" ref={calInputRef} className="hidden" accept=".cal,.txt,.csv"
                    onChange={(e) => e.target.files?.[0] && handleCalFile(e.target.files[0])}
                  />
                  <button
                    onClick={() => calInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                  >
                    <Upload size={16} className="text-emerald-400" /> Import .cal / .txt File
                  </button>
                  <p className="text-[9px] text-slate-600 px-2 italic">
                    * Format: one line per point. Frequency(Hz) Correction(dB). Standard microphone calibration files supported.
                  </p>
                </div>
              )}

              {/* SPL Calibration Offset */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SPL Calibration Offset</span>
                  <span className="text-[9px] mono font-bold text-emerald-400">{config.splCalOffset > 0 ? '+' : ''}{config.splCalOffset} dB</span>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <input
                    type="range" min="0" max="140" step="0.5"
                    value={config.splCalOffset}
                    onChange={(e) => updateConfig({ splCalOffset: parseFloat(e.target.value) })}
                    className="flex-1 h-1 bg-slate-800 rounded-full appearance-none accent-emerald-500"
                  />
                  <input
                    type="number" step="0.5" value={config.splCalOffset}
                    onChange={(e) => updateConfig({ splCalOffset: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] mono text-emerald-400 font-bold outline-none text-center"
                  />
                </div>
                <p className="text-[9px] text-slate-600 px-2 italic">
                  * Use a known SPL calibrator (94 or 114 dBSPL) to set the offset from dBFS to dBSPL.
                </p>
              </div>
            </div>

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
                isStarted={isEngineStarted}
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
                        {res.status === 'passed' ? `PASS (${res.duration.toFixed(2)}ms)` : `FAIL: ${res.message}`}
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
