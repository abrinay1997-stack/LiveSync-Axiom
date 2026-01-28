
import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import MainStage from './components/Layout/MainStage';
import ConfigModal from './components/ConfigModal';
import { useAudioSystem } from './hooks/useAudioSystem';
import { useTraces } from './hooks/useTraces';
import { useHotkeys } from './hooks/useHotkeys';
import { useMeasurementConfig } from './hooks/useMeasurementConfig';
import { useAcousticAnalyzer } from './hooks/useAcousticAnalyzer';

const App: React.FC = () => {
  const { isStarted, devices, selectedDevice, setSelectedDevice, toggleEngine, refreshDevices } = useAudioSystem();
  const { 
    traces, captureTrace, deleteTrace, renameTrace, clearAllTraces, toggleTraceVisibility, exportSession, importSession
  } = useTraces();
  const { config, setSmoothing, updateConfig } = useMeasurementConfig();
  
  const analysis = useAcousticAnalyzer(isStarted);

  const [activeTab, setActiveTab] = useState<'rta' | 'tf' | 'impulse' | 'security'>('rta');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);

  useHotkeys({
    'Space': captureTrace,
    'KeyB': () => setSidebarOpen(prev => !prev),
    'KeyR': analysis.resetAnalysis,
    'Digit1': () => setActiveTab('rta'),
    'Digit2': () => setActiveTab('tf'),
    'Digit3': () => setActiveTab('impulse'),
    'Digit4': () => setActiveTab('security'),
    'KeyD': analysis.runAutoDelay,
    'KeyE': analysis.generateCorrection,
    'Comma': () => setConfigOpen(prev => !prev) 
  });

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans select-none animate-fade-in">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isStarted={isStarted} 
        onToggleEngine={toggleEngine}
        onOpenConfig={() => setConfigOpen(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          traces={traces} 
          onCapture={captureTrace} 
          onDelete={deleteTrace}
          onRename={renameTrace}
          onToggleVisibility={toggleTraceVisibility}
          isEngineStarted={isStarted}
        />

        <MainStage 
          activeTab={activeTab}
          isStarted={isStarted}
          config={config}
          traces={traces}
          setSmoothing={setSmoothing}
          updateConfig={updateConfig}
          analysis={analysis}
        />
      </main>

      <Footer isStarted={isStarted} />

      <ConfigModal 
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onRefreshDevices={refreshDevices}
        isEngineStarted={isStarted}
        sessionActions={{
          exportSession,
          importSession,
          clearAll: clearAllTraces,
          hasTraces: traces.length > 0
        }}
      />
    </div>
  );
};

export default App;
