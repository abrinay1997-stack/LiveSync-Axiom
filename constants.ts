
import { MeasurementConfig } from './types';

export const COLORS = {
  primary: '#22d3ee', // cyan-400
  secondary: '#34d399', // emerald-400
  accent: '#fb7185', // rose-400
  warning: '#fbbf24', // amber-400
  phase: '#a78bfa', // violet-400
  coherence: '#fb923c', // orange-400
  bg: '#050505', 
  surface: '#0f0f0f',
  grid: 'rgba(255, 255, 255, 0.05)',
  spectrogram: [
    '#000004', '#140b35', '#3b0f70', '#641a80', '#8c2981', 
    '#b73779', '#de4968', '#f76f5c', '#fe9f6d', '#fec98d', '#fcfdbf'
  ]
};

export const TRACE_COLORS = [
  '#22d3ee', '#a855f7', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'
];

export const DEFAULT_CONFIG: MeasurementConfig = {
  fftSize: 4096,
  smoothing: '1/3',
  averaging: 'Exp',
  averagingCount: 8,
  minFreq: 20,
  maxFreq: 20000,
  minDb: -110, 
  maxDb: 0,    
  visualGain: 0, 
  tld: 3, // Target Landscape Distance por defecto actualizado a 3 dB
  showPhase: true,
  showCoherence: true
};

export const LOG_FREQUENCIES = [
  20, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

export const NOTE_FREQS = [
  { n: 'C', f: 16.35 }, { n: 'C#', f: 17.32 }, { n: 'D', f: 18.35 }, { n: 'D#', f: 19.45 },
  { n: 'E', f: 20.60 }, { n: 'F', f: 21.83 }, { n: 'F#', f: 23.12 }, { n: 'G', f: 24.50 },
  { n: 'G#', f: 25.96 }, { n: 'A', f: 27.50 }, { n: 'A#', f: 29.14 }, { n: 'B', f: 30.87 }
];
