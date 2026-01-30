
import React, { createContext, useContext, ReactNode } from 'react';
import { useMeasurementConfig } from '../hooks/useMeasurementConfig';
import { useTraces } from '../hooks/useTraces';
import { useAudioSystem } from '../hooks/useAudioSystem';
import { useAcousticAnalyzer } from '../hooks/useAcousticAnalyzer';
import { MeasurementConfig, TraceData } from '../types';

interface MeasurementContextType {
  config: MeasurementConfig;
  updateConfig: (updates: Partial<MeasurementConfig>) => void;
  setSmoothing: (s: any) => void;
  traces: TraceData[];
  captureTrace: () => void;
  deleteTrace: (id: string) => void;
  renameTrace: (id: string, name: string) => void;
  toggleTraceVisibility: (id: string) => void;
  clearAllTraces: () => void;
  exportSession: () => void;
  importSession: (file: File) => void;
  audioSystem: ReturnType<typeof useAudioSystem>;
  analysis: ReturnType<typeof useAcousticAnalyzer>;
}

const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

export const MeasurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const audioSystem = useAudioSystem();
  const { traces, captureTrace, deleteTrace, renameTrace, clearAllTraces, toggleTraceVisibility, exportSession, importSession } = useTraces();
  const { config, setSmoothing, updateConfig } = useMeasurementConfig();
  const analysis = useAcousticAnalyzer(audioSystem.isStarted);

  const value = {
    config, updateConfig, setSmoothing,
    traces, captureTrace, deleteTrace, renameTrace, clearAllTraces, toggleTraceVisibility, exportSession, importSession,
    audioSystem, analysis
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
};

export const useMeasurement = () => {
  const context = useContext(MeasurementContext);
  if (!context) throw new Error('useMeasurement must be used within a MeasurementProvider');
  return context;
};
