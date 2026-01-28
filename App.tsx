
import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import MainStage from './components/Layout/MainStage';
import { useAudioSystem } from './hooks/useAudioSystem';
import { useTraces } from './hooks/useTraces';
import { useHotkeys } from './hooks/useHotkeys';
import { useMeasurementConfig } from './hooks/useMeasurementConfig';
import { useAcousticAnalyzer } from './hooks/useAcousticAnalyzer';

const App: React.FC = () => {
  // 1. Core Systems Hooks
  const { isStarted, devices, selectedDevice, setSelectedDevice, toggleEngine, refreshDevices } = useAudioSystem();
  const { traces, captureTrace, deleteTrace, toggleTraceVisibility } = useTraces();
  const { config, setSmoothing } = useMeasurementConfig();
  
  // 2. Specialized Analysis Hook
  const analysis = useAcousticAnalyzer(isStarted);

  // 3. UI State
  const [activeTab, setActiveTab] = useState<'rta' | 'tf' | 'impulse' | 'security'>('rta');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 4. Keyboard Orchestration
  useHotkeys({
    'Space': captureTrace,
    'KeyB': () => setSidebarOpen(prev => !prev),
    'KeyR': analysis.resetAnalysis,
    'Digit1': () => setActiveTab('rta'),
    'Digit2': () => setActiveTab('tf'),
    'Digit3': () => setActiveTab('impulse'),
    'Digit4': () => setActiveTab('security'),
    'KeyD': analysis.runAutoDelay,
    'KeyE': analysis.generateCorrection
  });

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans select-none animate-fade-in">
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

        <MainStage 
          activeTab={activeTab}
          isStarted={isStarted}
          config={config}
          traces={traces}
          setSmoothing={setSmoothing}
          analysis={analysis}
        />
      </main>

      <Footer isStarted={isStarted} />
    </div>
  );
};

export default App;
