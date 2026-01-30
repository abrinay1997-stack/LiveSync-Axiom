
import { SmoothingType, TraceMetadata } from '../types';
import { AudioEngine } from './AudioEngine';

export const AcousticUtils = {
  
  computeInverseEQ(meas: Float32Array, ref: Float32Array): Float32Array {
    const bins = meas.length;
    const eq = new Float32Array(bins);
    const smoothedMeas = AudioEngine.applySmoothing(meas, '1/3');
    const smoothedRef = AudioEngine.applySmoothing(ref, '1/3');

    for (let i = 0; i < bins; i++) {
      const delta = smoothedMeas[i] - smoothedRef[i];
      eq[i] = -Math.max(-12, Math.min(9, delta));
    }
    return eq;
  },

  /**
   * Extrae métricas clave de una captura de magnitud.
   * Optimizado para recibir directamente la vista Float32Array.
   */
  analyzeTrace(data: Float32Array<ArrayBufferLike>, sampleRate: number): TraceMetadata {
    let maxVal = -Infinity;
    let peakIdx = 0;
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val > maxVal) {
        maxVal = val;
        peakIdx = i;
      }
      sum += val;
    }

    const peakFreq = (peakIdx * sampleRate) / (data.length * 2);
    const avgLevel = sum / data.length;

    return { peakFreq, avgLevel };
  },

  samplesToMeters(samples: number, sampleRate: number): number {
    return (samples / sampleRate) * 343;
  },

  samplesToMs(samples: number, sampleRate: number): number {
    return (samples / sampleRate) * 1000;
  }
};
