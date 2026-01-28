
import { useState, useCallback } from 'react';
import { TraceData } from '../types';
import { TRACE_COLORS } from '../constants';
import { audioEngine } from '../services/AudioEngine';

export const useTraces = () => {
  const [traces, setTraces] = useState<TraceData[]>([]);

  const captureTrace = useCallback(() => {
    const analyzer = audioEngine.getAnalyzer();
    if (!analyzer) return;
    
    const data = new Float32Array(analyzer.frequencyBinCount);
    analyzer.getFloatFrequencyData(data);
    
    const newTrace: TraceData = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Capture ${traces.length + 1}`,
      color: TRACE_COLORS[traces.length % TRACE_COLORS.length],
      magnitudes: new Float32Array(data),
      timestamp: Date.now(),
      visible: true
    };

    setTraces(prev => [...prev, newTrace]);
    return newTrace;
  }, [traces.length]);

  const deleteTrace = useCallback((id: string) => {
    setTraces(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleTraceVisibility = useCallback((id: string) => {
    setTraces(prev => prev.map(t => t.id === id ? { ...t, visible: !t.visible } : t));
  }, []);

  return {
    traces,
    captureTrace,
    deleteTrace,
    toggleTraceVisibility
  };
};
