
export type SmoothingType = 'none' | '1/1' | '1/3' | '1/6' | '1/12' | '1/24' | '1/48';
export type AveragingType = 'None' | 'Exp' | 'Lin' | 'Inf';
export type WeightingType = 'Flat' | 'A' | 'C';

export interface MeasurementConfig {
  fftSize: number;
  smoothing: SmoothingType;
  averaging: AveragingType;
  averagingCount: number;
  minFreq: number;
  maxFreq: number;
  minDb: number;
  maxDb: number;
  showPhase: boolean;
  showCoherence: boolean;
}

export interface TraceData {
  id: string;
  name: string;
  color: string;
  magnitudes: Float32Array;
  phase?: Float32Array;
  coherence?: Float32Array;
  timestamp: number;
  visible: boolean;
}

export interface TFData {
  magnitude: Float32Array;
  phase: Float32Array;
  coherence: Float32Array;
  correctionEq?: Float32Array;
}
