
import React, { useState } from 'react';
import { RotateCcw, Activity, Clock, Wand2 } from 'lucide-react';
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
    <div className="flex flex-col h-screen bg-black text-slate-200 overflow-hidden font-sans select-none">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} isStarted={isStarted} onToggleEngine={toggleEngine} />

      <main className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} traces={traces} onCapture={captureTrace} onDeleteTrace={deleteTrace}
          onToggleVisibility={toggleTraceVisibility} devices={devices} selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice} onRefreshDevices={refreshDevices} isEngineStarted={isStarted}
        />

        <section className="flex-1 flex flex-col bg-black p-4 gap-4 overflow-hidden">
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
            <div className="flex gap-4 items-center bg-slate-950 border border-white/5 p-2 rounded-xl shrink-0">
              <div className="flex gap-2 items-center px-2 border-r border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Smoothing</span>
                {(['none', '1/3', '1/12', '1/48'] as const).map(s => (
                  <button key={s} onClick={() => setSmoothing(s)} className={`px-3 py-1 rounded text-[10px] font-mono border transition-all ${config.smoothing === s ? 'bg-cyan-500 border-cyan-400 text-black font-bold' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}>{s.toUpperCase()}</button>
                ))}
              </div>

              {(activeTab === 'tf' || activeTab === 'impulse') && (
                <div className="flex items-center gap-3 px-2 border-r border-white/5">
                  <button 
                    onClick={handleAutoDelay} disabled={isFindingDelay || !isStarted}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${isFindingDelay ? 'bg-cyan-500/50 text-white animate-pulse' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'}`}
                  >
                    <Activity size={12} /> {isFindingDelay ? 'Analyzing...' : 'Auto-Delay (D)'}
                  </button>
                  {activeTab === 'tf' && (
                    <button 
                      onClick={handleGenerateEQ} disabled={!isStarted}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                    >
                      <Wand2 size={12} /> Correction EQ (E)
                    </button>
                  )}
                  {detectedDelay && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                       <Clock size={12} className="text-slate-500" />
                       <span className="text-[10px] mono text-cyan-400 font-bold">{detectedDelay.ms.toFixed(2)}ms</span>
                       <span className="text-[10px] mono text-slate-300 ml-2">{detectedDelay.m.toFixed(2)}m</span>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={() => { audioEngine.resetAveraging(); setDetectedDelay(null); }}
                className="p-2 text-slate-500 hover:text-white transition-colors ml-auto group" title="Reset (R)"
              >
                <RotateCcw size={16} className="group-active:rotate-180 transition-transform duration-300" />
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer isStarted={isStarted} />
    </div>
  );
};

export default App;
