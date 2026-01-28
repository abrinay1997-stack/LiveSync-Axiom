
import React, { useState } from 'react';
import { RotateCcw, Activity, Clock, Wand2, Command } from 'lucide-react';
import RTADisplay from './components/RTADisplay';
import SpectrogramDisplay from './components/SpectrogramDisplay';
import TransferDisplay from './components/TransferDisplay';
import ImpulseDisplay from './components/ImpulseDisplay';
import WatermarkPanel from './components/WatermarkPanel';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import { useAudioSystem } from './hooks/useAudioSystem';
import { useTraces } from './hooks/useTraces';
import { useHotkeys } from './hooks/useHotkeys';
import { useMeasurementConfig } from './hooks/useMeasurementConfig';
import { audioEngine } from './services/AudioEngine';

const App: React.FC = () => {
  const { isStarted, devices, selectedDevice, setSelectedDevice, toggleEngine, refreshDevices } = useAudioSystem();
  const { traces, captureTrace, deleteTrace, toggleTraceVisibility } = useTraces();
  const { config, setSmoothing, setAveraging } = useMeasurementConfig();

  const [activeTab, setActiveTab] = useState<'rta' | 'tf' | 'impulse' | 'security'>('rta');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detectedDelay, setDetectedDelay] = useState<{ ms: number, m: number } | null>(null);
  const [isFindingDelay, setIsFindingDelay] = useState(false);

  const handleAutoDelay = async () => {
    if (!isStarted) return;
    setIsFindingDelay(true);
    const result = await audioEngine.computeAutoDelay();
    setDetectedDelay({ ms: result.ms, m: result.meters });
    setIsFindingDelay(false);
  };

  const handleGenerateEQ = () => {
    if (!isStarted) return;
    audioEngine.generateInverseEQ();
  };

  useHotkeys({
    'Space': captureTrace,
    'KeyB': () => setSidebarOpen(prev => !prev),
    'KeyR': () => {
      audioEngine.resetAveraging();
      setDetectedDelay(null);
    },
    'Digit1': () => setActiveTab('rta'),
    'Digit2': () => setActiveTab('tf'),
    'Digit3': () => setActiveTab('impulse'),
    'Digit4': () => setActiveTab('security'),
    'KeyD': handleAutoDelay,
    'KeyE': handleGenerateEQ
  });

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans select-none animate-fade-in">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} isStarted={isStarted} onToggleEngine={toggleEngine} />

      <main className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} traces={traces} onCapture={captureTrace} onDeleteTrace={deleteTrace}
          onToggleVisibility={toggleTraceVisibility} devices={devices} selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice} onRefreshDevices={refreshDevices} isEngineStarted={isStarted}
        />

        <section className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
          {activeTab === 'rta' && (
            <>
              <RTADisplay config={config} isActive={isStarted} traces={traces} />
              <SpectrogramDisplay config={config} isActive={isStarted} />
            </>
          )}
          {activeTab === 'tf' && <TransferDisplay config={config} isActive={isStarted} traces={traces} />}
          {activeTab === 'impulse' && <ImpulseDisplay isActive={isStarted} />}
          {activeTab === 'security' && <WatermarkPanel />}

          {(activeTab === 'rta' || activeTab === 'tf' || activeTab === 'impulse') && (
            <div className="flex gap-6 items-center bg-[#0f0f0f] border border-white/10 p-4 rounded-2xl shrink-0 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-white/5"></div>
              
              <div className="flex gap-2 items-center px-4 border-r border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Smoothing</span>
                {(['none', '1/3', '1/12', '1/48'] as const).map(s => (
                  <button key={s} onClick={() => setSmoothing(s)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${config.smoothing === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}>{s.toUpperCase()}</button>
                ))}
              </div>

              {(activeTab === 'tf' || activeTab === 'impulse') && (
                <div className="flex items-center gap-4 px-4 border-r border-white/5">
                  <button 
                    onClick={handleAutoDelay} disabled={isFindingDelay || !isStarted}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isFindingDelay ? 'bg-cyan-500/50 text-white animate-pulse' : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-400'}`}
                  >
                    <Activity size={14} /> {isFindingDelay ? 'Calculating Delay...' : 'Auto-Delay (D)'}
                  </button>
                  {activeTab === 'tf' && (
                    <button 
                      onClick={handleGenerateEQ} disabled={!isStarted}
                      className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                    >
                      <Wand2 size={14} /> Generate Correction (E)
                    </button>
                  )}
                  {detectedDelay && (
                    <div className="flex items-center gap-3 px-5 py-2 bg-black rounded-xl border border-white/10">
                       <Clock size={14} className="text-cyan-400" />
                       <div className="flex gap-4 mono font-black">
                         <span className="text-white text-xs">{detectedDelay.ms.toFixed(2)}ms</span>
                         <span className="text-slate-600 text-[10px]">{detectedDelay.m.toFixed(2)}m</span>
                       </div>
                    </div>
                  )}
                </div>
              )}

              <div className="ml-auto flex items-center gap-6">
                 <div className="hidden lg:flex items-center gap-3 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                    <Command size={12} />
                    <span>Space: Capture | R: Reset | B: Hide Sidebar</span>
                 </div>
                 <button 
                  onClick={() => { audioEngine.resetAveraging(); setDetectedDelay(null); }}
                  className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all active:rotate-180 duration-500" title="Reset (R)"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer isStarted={isStarted} />
    </div>
  );
};

export default App;
