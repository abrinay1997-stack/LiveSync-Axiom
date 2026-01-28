
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
};

export const TRACE_COLORS = [
  '#22d3ee', // Cyan
  '#a855f7', // Purple
  '#f472b6', // Pink
  '#fbbf24', // Amber
  '#34d399', // Emerald
  '#60a5fa', // Blue
];

export const DEFAULT_CONFIG: MeasurementConfig = {
  fftSize: 4096,
  smoothing: '1/3',
  averaging: 'Exp',
  averagingCount: 8,
  minFreq: 20,
  maxFreq: 20000,
  minDb: -90,
  maxDb: 10,
  showPhase: true,
  showCoherence: true
};

export const LOG_FREQUENCIES = [
  20, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];
