
import React, { useState } from 'react';
import { GitCompare, RotateCcw } from 'lucide-react';
import RTADisplay from './components/RTADisplay';
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

  const [activeTab, setActiveTab] = useState<'rta' | 'tf' | 'security'>('rta');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useHotkeys({
    'Space': captureTrace,
    'KeyB': () => setSidebarOpen(prev => !prev),
    'KeyR': () => audioEngine.resetAveraging(),
    'Digit1': () => setActiveTab('rta'),
    'Digit2': () => setActiveTab('tf'),
    'Digit3': () => setActiveTab('security'),
  });

  return (
    <div className="flex flex-col h-screen bg-black text-slate-200 overflow-hidden font-sans select-none">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isStarted={isStarted} 
        onToggleEngine={toggleEngine} 
      />

      <main className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          traces={traces} 
          onCapture={captureTrace} 
          onDeleteTrace={deleteTrace}
          onToggleVisibility={toggleTraceVisibility}
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          onRefreshDevices={refreshDevices}
          isEngineStarted={isStarted}
        />

        <section className="flex-1 flex flex-col bg-black p-4 relative">
          {activeTab === 'rta' && (
            <div className="flex-1 flex flex-col gap-4">
              <RTADisplay config={config} isActive={isStarted} traces={traces} />
              
              <div className="flex gap-4 items-center bg-slate-950 border border-white/5 p-2 rounded-xl shrink-0 overflow-x-auto">
                <div className="flex gap-2 items-center px-2 border-r border-white/5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Smoothing</span>
                  {(['none', '1/3', '1/12', '1/48'] as const).map(s => (
                    <button 
                      key={s}
                      onClick={() => setSmoothing(s)}
                      className={`px-3 py-1 rounded text-[10px] font-mono border transition-all ${config.smoothing === s ? 'bg-cyan-500 border-cyan-400 text-black font-bold' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 items-center px-2 border-r border-white/5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Averaging</span>
                  {(['None', 'Exp', 'Inf'] as const).map(a => (
                    <button 
                      key={a}
                      onClick={() => setAveraging(a)}
                      className={`px-3 py-1 rounded text-[10px] font-mono border transition-all ${config.averaging === a ? 'bg-amber-400 border-amber-300 text-black font-bold' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                      {a.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => audioEngine.resetAveraging()}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  title="Reset Averaging (R)"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && <WatermarkPanel />}

          {activeTab === 'tf' && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-950/20 animate-pulse">
              <GitCompare className="text-slate-800 mb-4" size={64} />
              <h2 className="text-slate-500 font-black uppercase tracking-widest text-xl">Transfer Function</h2>
              <p className="text-slate-700 font-mono text-sm mt-2 uppercase tracking-tighter">Dual-Channel Logic Ready (Internal)</p>
            </div>
          )}
        </section>
      </main>

      <Footer isStarted={isStarted} />
    </div>
  );
};

export default App;
