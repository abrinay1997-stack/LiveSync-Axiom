
import { useState, useCallback, useEffect } from 'react';
import { TraceData } from '../types';
import { TRACE_COLORS } from '../constants';
import { audioEngine } from '../services/AudioEngine';
import { AcousticUtils } from '../services/AcousticUtils';
import { toArrayBuffer } from '../services/AudioUtils';

const STORAGE_KEY = 'livesync_snapshots';

export const useTraces = () => {
  const [traces, setTraces] = useState<TraceData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          magnitudes: new Float32Array(t.magnitudes),
          phase: t.phase ? new Float32Array(t.phase) : undefined,
          coherence: t.coherence ? new Float32Array(t.coherence) : undefined
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const toSave = traces.map(t => ({
      ...t,
      magnitudes: Array.from(t.magnitudes),
      phase: t.phase ? Array.from(t.phase) : undefined,
      coherence: t.coherence ? Array.from(t.coherence) : undefined
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [traces]);

  const captureTrace = useCallback(() => {
    const analyzer = audioEngine.getAnalyzer();
    if (!analyzer) return;
    
    let data: Float32Array;
    let isSweep = false;
    
    const lastSweep = (window as any).Axiom_LastSweepData;
    if (lastSweep instanceof Float32Array) {
      data = lastSweep.slice();
      delete (window as any).Axiom_LastSweepData;
      isSweep = true;
    } else {
      data = new Float32Array(analyzer.frequencyBinCount);
      analyzer.getFloatFrequencyData(data);
    }
    
    const tf = audioEngine.getTransferFunction('none');
    
    // CORRECCIÓN NETLIFY: Analizamos sobre la vista actual
    const metadata = AcousticUtils.analyzeTrace(data, 48000);
    
    // Aseguramos que las magnitudes guardadas sean copias limpias (clones)
    const savedMagnitudes = new Float32Array(toArrayBuffer(data));
    const savedPhase = new Float32Array(toArrayBuffer(tf.phase));
    const savedCoherence = new Float32Array(toArrayBuffer(tf.coherence));

    const newTrace: TraceData = {
      id: Math.random().toString(36).substr(2, 9),
      name: isSweep ? `Sweep Capture ${traces.length + 1}` : `Instant ${traces.length + 1}`,
      color: isSweep ? '#22d3ee' : TRACE_COLORS[traces.length % TRACE_COLORS.length],
      magnitudes: savedMagnitudes,
      phase: savedPhase,
      coherence: savedCoherence,
      timestamp: Date.now(),
      visible: true,
      metadata
    };

    setTraces(prev => [...prev, newTrace]);
    return newTrace;
  }, [traces.length]);

  const deleteTrace = useCallback((id: string) => {
    setTraces(prev => prev.filter(t => t.id !== id));
  }, []);

  const renameTrace = useCallback((id: string, newName: string) => {
    setTraces(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
  }, []);

  const clearAllTraces = useCallback(() => {
    if (window.confirm('¿Deseas eliminar todas las capturas guardadas?')) {
      setTraces([]);
    }
  }, []);

  const toggleTraceVisibility = useCallback((id: string) => {
    setTraces(prev => prev.map(t => t.id === id ? { ...t, visible: !t.visible } : t));
  }, []);

  const exportSession = useCallback(() => {
    const dataStr = JSON.stringify(traces.map(t => ({ 
      ...t, 
      magnitudes: Array.from(t.magnitudes),
      phase: t.phase ? Array.from(t.phase) : undefined,
      coherence: t.coherence ? Array.from(t.coherence) : undefined
    })));
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `livesync-session-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  }, [traces]);

  const importSession = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const imported = json.map((t: any) => ({
          ...t,
          magnitudes: new Float32Array(t.magnitudes),
          phase: t.phase ? new Float32Array(t.phase) : undefined,
          coherence: t.coherence ? new Float32Array(t.coherence) : undefined
        }));
        setTraces(prev => [...prev, ...imported]);
      } catch (err) {
        alert("Error al importar sesión. Formato no válido.");
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    traces,
    captureTrace,
    deleteTrace,
    renameTrace,
    clearAllTraces,
    toggleTraceVisibility,
    exportSession,
    importSession
  };
};
