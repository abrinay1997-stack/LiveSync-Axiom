
import { useState, useCallback } from 'react';
import { audioEngine } from '../services/AudioEngine';
import { AcousticUtils } from '../services/AcousticUtils';

export const useAcousticAnalyzer = (isStarted: boolean) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [delayData, setDelayData] = useState<{ ms: number, m: number } | null>(null);
  const [targetEq, setTargetEq] = useState<Float32Array | null>(null);

  const runAutoDelay = useCallback(async () => {
    if (!isStarted) return;
    setIsAnalyzing(true);
    const result = await audioEngine.computeAutoDelay();
    setDelayData({ ms: result.ms, m: result.meters });
    setIsAnalyzing(false);
  }, [isStarted]);

  const generateCorrection = useCallback(() => {
    if (!isStarted) return;
    const meas = audioEngine.getProcessedData('none', 'Exp', false);
    const ref = audioEngine.getProcessedData('none', 'Exp', true);
    
    if (meas.length && ref.length) {
      const eq = AcousticUtils.computeInverseEQ(meas, ref);
      setTargetEq(eq);
      // Inyectamos el resultado en el engine para la visualización global
      (audioEngine as any).targetEq = eq; 
    }
  }, [isStarted]);

  const resetAnalysis = useCallback(() => {
    audioEngine.resetAveraging();
    setDelayData(null);
    setTargetEq(null);
    (audioEngine as any).targetEq = null;
  }, []);

  return {
    isAnalyzing,
    delayData,
    targetEq,
    runAutoDelay,
    generateCorrection,
    resetAnalysis
  };
};
