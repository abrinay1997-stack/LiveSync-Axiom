
export type SmoothingType = 'none' | '1/1' | '1/3' | '1/6' | '1/12' | '1/24' | '1/48';
export type AveragingType = 'None' | 'Exp' | 'Lin' | 'Inf';
export type WeightingType = 'Flat' | 'A' | 'C';
export type WindowType = 'hann' | 'hamming' | 'blackman-harris' | 'flattop' | 'rectangular';

export interface TraceMetadata {
  peakFreq: number;
  avgLevel: number;
}

export interface MicCalibration {
  name: string;
  freqs: number[];
  corrections: number[]; // dB correction per frequency
}

export interface MeasurementConfig {
  fftSize: number;
  smoothing: SmoothingType;
  averaging: AveragingType;
  averagingCount: number;
  windowType: WindowType;
  useMTW: boolean;
  minFreq: number;
  maxFreq: number;
  minDb: number;
  maxDb: number;
  visualGain: number;
  tld: number; // Target Landscape Distance (dB/octave)
  showPhase: boolean;
  showCoherence: boolean;
  showGroupDelay: boolean;
  splCalOffset: number; // dBFS → dBSPL offset
  micCalibration: MicCalibration | null;
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
  metadata?: TraceMetadata;
}

export interface TFData {
  magnitude: Float32Array;
  phase: Float32Array;
  coherence: Float32Array;
  groupDelay?: Float32Array;
  correctionEq?: Float32Array;
}
