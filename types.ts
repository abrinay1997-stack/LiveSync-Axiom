
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

// ─── Correction Analysis Types ───────────────────────────────────────────────

export type TargetCurveType = 'flat' | 'house' | 'x-curve' | 'custom';

export type ProblemType =
  | 'room_mode'      // Narrow peak at low freq (standing wave)
  | 'sbir'           // Speaker-boundary interference
  | 'comb_filter'    // Reflection causing comb pattern
  | 'absorption'     // Too much/little absorption
  | 'coverage'       // Speaker coverage issue
  | 'eq_able';       // Generic issue fixable with EQ

export type TreatmentType =
  | 'bass_trap'
  | 'absorber'
  | 'diffuser'
  | 'move_source'
  | 'move_listener'
  | 'panel';

export interface EQBand {
  freq: number;           // Hz
  gain: number;           // dB (negative = cut, positive = boost)
  q: number;              // Q factor
  type: 'peak' | 'lowshelf' | 'highshelf' | 'notch';
}

export interface AcousticSolution {
  treatment: TreatmentType;
  description: string;
  location: string;
  estimatedImprovement: number;  // dB
  difficulty: 'easy' | 'moderate' | 'major';
  cost: 'low' | 'medium' | 'high';
}

export interface ProblemDiagnosis {
  id: string;
  frequency: number;          // Center frequency Hz
  magnitude: number;          // dB deviation from target
  bandwidth: number;          // Hz (width of the problem)
  q: number;                  // Sharpness
  type: ProblemType;
  confidence: number;         // 0-1 based on coherence

  // Solutions
  eqSolution: EQBand;
  acousticSolution: AcousticSolution;

  // Recommendation
  recommendEQ: boolean;       // true if EQ can effectively fix this
  recommendAcoustic: boolean; // true if acoustic treatment is better
}

export interface CorrectionAnalysis {
  problems: ProblemDiagnosis[];
  targetCurve: TargetCurveType;
  overallDeviation: number;   // RMS dB from target
  eqBandsNeeded: number;
  acousticIssuesCount: number;
  summary: string;
}
