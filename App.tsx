
import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import MainStage from './components/Layout/MainStage';
import KnowledgeBase from './components/Layout/KnowledgeBase';
import ConfigModal from './components/ConfigModal';
import { MeasurementProvider, useMeasurement } from './context/MeasurementContext';
import { useHotkeys } from './hooks/useHotkeys';

const AppContent: React.FC = () => {
  const { 
    audioSystem, traces, captureTrace, analysis, config, 
    clearAllTraces, exportSession, importSession 
  } = useMeasurement();

  const [activeTab, setActiveTab] = useState<'rta' | 'tf' | 'impulse'>('rta');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useHotkeys({
    'Space': captureTrace,
    'KeyB': () => setSidebarOpen(prev => !prev),
    'KeyR': analysis.resetAnalysis,
    'Digit1': () => setActiveTab('rta'),
    'Digit2': () => setActiveTab('tf'),
    'Digit3': () => setActiveTab('impulse'),
    'KeyD': analysis.runAutoDelay,
    'KeyE': analysis.generateCorrection,
    'Comma': () => setConfigOpen(prev => !prev),
    'KeyH': () => setKnowledgeOpen(prev => !prev) 
  });

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans select-none animate-fade-in">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isStarted={audioSystem.isStarted} 
        onToggleEngine={audioSystem.toggleEngine}
        onOpenConfig={() => setConfigOpen(true)}
        layout={{
          sidebar: sidebarOpen,
          bottom: bottomOpen,
          knowledge: knowledgeOpen,
          setSidebar: setSidebarOpen,
          setBottom: setBottomOpen,
          setKnowledge: setKnowledgeOpen
        }}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && <Sidebar isOpen={sidebarOpen} />}
        
        <div className="flex-1 flex flex-col min-w-0">
          <MainStage activeTab={activeTab} bottomVisible={bottomOpen} />
        </div>

        <KnowledgeBase 
          activeTab={activeTab} 
          isOpen={knowledgeOpen} 
          onClose={() => setKnowledgeOpen(false)} 
        />
      </main>

      <Footer isStarted={audioSystem.isStarted} />

      <ConfigModal 
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        devices={audioSystem.devices}
        selectedDevice={audioSystem.selectedDevice}
        onSelectDevice={audioSystem.setSelectedDevice}
        onRefreshDevices={audioSystem.refreshDevices}
        isEngineStarted={audioSystem.isStarted}
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

const App: React.FC = () => (
  <MeasurementProvider>
    <AppContent />
  </MeasurementProvider>
);

export default App;
