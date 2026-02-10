
/**
 * CorrectionAnalyzer.ts — Analyzes transfer function to suggest EQ and acoustic corrections.
 *
 * Features:
 * - Peak/dip detection with Q estimation
 * - Problem classification (room mode, SBIR, absorption, etc.)
 * - Parametric EQ band calculation
 * - Acoustic treatment recommendations
 * - Target curve comparison (Flat, House Curve, X-Curve)
 */

import type {
  ProblemDiagnosis,
  CorrectionAnalysis,
  EQBand,
  AcousticSolution,
  ProblemType,
  TargetCurveType,
} from '../types';

const SAMPLE_RATE = 48000;

// ─── Target Curves ───────────────────────────────────────────────────────────

/**
 * Generate target curve for comparison.
 * All curves are in dB relative to 0dB at 1kHz.
 */
export function generateTargetCurve(
  type: TargetCurveType,
  bins: number,
  fftSize: number
): Float32Array {
  const target = new Float32Array(bins);

  switch (type) {
    case 'flat':
      // Perfectly flat response
      target.fill(0);
      break;

    case 'house':
      // Classic house curve: +3dB at 60Hz, flat 200-4kHz, -3dB at 10kHz
      // Gentle slope that sounds natural in larger rooms
      for (let i = 0; i < bins; i++) {
        const freq = (i * SAMPLE_RATE) / fftSize;
        if (freq < 20) {
          target[i] = 0;
        } else if (freq < 200) {
          // LF boost: +3dB at 60Hz, tapering to 0dB at 200Hz
          const octaves = Math.log2(freq / 200);
          target[i] = Math.max(0, -octaves * 1.5); // ~+3dB at 60Hz
        } else if (freq < 4000) {
          // Flat midrange
          target[i] = 0;
        } else {
          // HF rolloff: -3dB per octave above 4kHz
          const octaves = Math.log2(freq / 4000);
          target[i] = -octaves * 3;
        }
      }
      break;

    case 'x-curve':
      // Cinema X-Curve: flat to 2kHz, then -3dB/octave
      for (let i = 0; i < bins; i++) {
        const freq = (i * SAMPLE_RATE) / fftSize;
        if (freq < 2000) {
          target[i] = 0;
        } else {
          const octaves = Math.log2(freq / 2000);
          target[i] = -octaves * 3;
        }
      }
      break;

    case 'custom':
    default:
      target.fill(0);
  }

  return target;
}

// ─── Peak/Dip Detection ──────────────────────────────────────────────────────

interface DetectedPeak {
  binIndex: number;
  frequency: number;
  magnitude: number;      // dB deviation from target
  q: number;
  bandwidth: number;      // Hz
  isPeak: boolean;        // true = peak, false = dip
}

/**
 * Detect peaks and dips in the transfer function relative to target.
 */
function detectPeaksAndDips(
  magnitude: Float32Array,
  target: Float32Array,
  coherence: Float32Array,
  fftSize: number,
  threshold: number = 3  // dB deviation to consider significant
): DetectedPeak[] {
  const peaks: DetectedPeak[] = [];
  const bins = magnitude.length;
  const binWidth = SAMPLE_RATE / fftSize;

  // Compute difference from target
  const diff = new Float32Array(bins);
  for (let i = 0; i < bins; i++) {
    diff[i] = magnitude[i] - target[i];
  }

  // Find local maxima and minima
  for (let i = 2; i < bins - 2; i++) {
    const freq = i * binWidth;
    if (freq < 20 || freq > 20000) continue;

    // Skip if coherence is too low (unreliable data)
    if (coherence[i] < 0.5) continue;

    const val = diff[i];
    const isLocalMax = val > diff[i - 1] && val > diff[i + 1] &&
                       val > diff[i - 2] && val > diff[i + 2];
    const isLocalMin = val < diff[i - 1] && val < diff[i + 1] &&
                       val < diff[i - 2] && val < diff[i + 2];

    if ((isLocalMax || isLocalMin) && Math.abs(val) >= threshold) {
      // Estimate Q by finding -3dB points
      const peakVal = val;
      const target3dB = Math.abs(peakVal) - 3;
      let lowBin = i, highBin = i;

      // Find lower -3dB point
      for (let j = i - 1; j >= 0; j--) {
        if (Math.abs(diff[j]) <= target3dB) {
          lowBin = j;
          break;
        }
      }

      // Find upper -3dB point
      for (let j = i + 1; j < bins; j++) {
        if (Math.abs(diff[j]) <= target3dB) {
          highBin = j;
          break;
        }
      }

      const bandwidth = (highBin - lowBin) * binWidth;
      const q = bandwidth > 0 ? freq / bandwidth : 10;

      peaks.push({
        binIndex: i,
        frequency: freq,
        magnitude: val,
        q: Math.min(Math.max(q, 0.3), 20), // Clamp Q to reasonable range
        bandwidth,
        isPeak: isLocalMax,
      });
    }
  }

  // Sort by magnitude (most severe first)
  peaks.sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude));

  // Limit to top 10 problems
  return peaks.slice(0, 10);
}

// ─── Problem Classification ──────────────────────────────────────────────────

/**
 * Classify a detected peak/dip into a problem type.
 */
function classifyProblem(peak: DetectedPeak): ProblemType {
  const { frequency, q, isPeak, magnitude } = peak;

  // Room modes: narrow peaks below 300Hz
  if (frequency < 300 && q > 5 && isPeak) {
    return 'room_mode';
  }

  // SBIR: dips in the 80-300Hz range with moderate Q
  if (frequency >= 80 && frequency <= 300 && !isPeak && q >= 2 && q <= 8) {
    return 'sbir';
  }

  // Comb filtering: multiple evenly-spaced peaks/dips (detected elsewhere)
  // For now, narrow dips at any frequency suggest comb filter
  if (!isPeak && q > 8) {
    return 'comb_filter';
  }

  // Absorption issues: broad HF rolloff
  if (frequency > 4000 && !isPeak && q < 2) {
    return 'absorption';
  }

  // Coverage: broad midrange dips
  if (frequency >= 500 && frequency <= 4000 && !isPeak && q < 3) {
    return 'coverage';
  }

  // Default: generic EQ-able problem
  return 'eq_able';
}

/**
 * Generate EQ solution for a problem.
 */
function generateEQSolution(peak: DetectedPeak): EQBand {
  const { frequency, magnitude, q } = peak;

  // Determine EQ type
  let type: EQBand['type'] = 'peak';
  if (frequency < 80) {
    type = 'lowshelf';
  } else if (frequency > 10000) {
    type = 'highshelf';
  } else if (q > 10 && Math.abs(magnitude) > 6) {
    type = 'notch';
  }

  return {
    freq: Math.round(frequency),
    gain: -magnitude, // Inverse of the problem
    q: Math.round(q * 10) / 10,
    type,
  };
}

/**
 * Generate acoustic treatment solution for a problem.
 */
function generateAcousticSolution(
  peak: DetectedPeak,
  problemType: ProblemType
): AcousticSolution {
  const { frequency, magnitude } = peak;

  switch (problemType) {
    case 'room_mode':
      return {
        treatment: 'bass_trap',
        description: `Room mode at ${Math.round(frequency)}Hz causing ${magnitude > 0 ? '+' : ''}${magnitude.toFixed(1)}dB peak`,
        location: 'Corners of the room (floor-ceiling, wall-wall intersections)',
        estimatedImprovement: Math.min(Math.abs(magnitude), 6),
        difficulty: 'moderate',
        cost: 'medium',
      };

    case 'sbir':
      return {
        treatment: 'move_source',
        description: `Speaker-boundary interference at ${Math.round(frequency)}Hz`,
        location: 'Move speakers away from rear wall or add rear absorption',
        estimatedImprovement: Math.min(Math.abs(magnitude), 8),
        difficulty: 'easy',
        cost: 'low',
      };

    case 'comb_filter':
      return {
        treatment: 'absorber',
        description: `Reflection causing comb filtering at ${Math.round(frequency)}Hz`,
        location: 'First reflection points (side walls, ceiling)',
        estimatedImprovement: Math.min(Math.abs(magnitude), 6),
        difficulty: 'easy',
        cost: 'low',
      };

    case 'absorption':
      return {
        treatment: 'panel',
        description: `Excessive HF absorption or air loss above ${Math.round(frequency)}Hz`,
        location: 'Reduce soft materials or move measurement closer',
        estimatedImprovement: Math.min(Math.abs(magnitude), 4),
        difficulty: 'easy',
        cost: 'low',
      };

    case 'coverage':
      return {
        treatment: 'move_listener',
        description: `Coverage issue at ${Math.round(frequency)}Hz - possible off-axis position`,
        location: 'Adjust speaker aim or listener position',
        estimatedImprovement: Math.min(Math.abs(magnitude), 6),
        difficulty: 'easy',
        cost: 'low',
      };

    default:
      return {
        treatment: 'absorber',
        description: `Frequency anomaly at ${Math.round(frequency)}Hz`,
        location: 'General room treatment',
        estimatedImprovement: Math.min(Math.abs(magnitude), 4),
        difficulty: 'moderate',
        cost: 'medium',
      };
  }
}

/**
 * Determine if EQ or acoustic treatment is recommended.
 */
function getRecommendations(problemType: ProblemType, q: number, magnitude: number): {
  recommendEQ: boolean;
  recommendAcoustic: boolean;
} {
  switch (problemType) {
    case 'room_mode':
      // Room modes: acoustic is better, EQ helps but doesn't fix ringing
      return { recommendEQ: true, recommendAcoustic: true };

    case 'sbir':
      // SBIR: acoustic fix is much better
      return { recommendEQ: false, recommendAcoustic: true };

    case 'comb_filter':
      // Comb filters: EQ doesn't help (moves with listener)
      return { recommendEQ: false, recommendAcoustic: true };

    case 'absorption':
      // Absorption issues: EQ can help if it's just distance loss
      return { recommendEQ: true, recommendAcoustic: Math.abs(magnitude) > 6 };

    case 'coverage':
      // Coverage: physical adjustment is better
      return { recommendEQ: Math.abs(magnitude) < 4, recommendAcoustic: true };

    case 'eq_able':
    default:
      // Generic issues: EQ is fine
      return { recommendEQ: true, recommendAcoustic: false };
  }
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

/**
 * Analyze transfer function and generate correction recommendations.
 */
export function analyzeCorrections(
  magnitude: Float32Array,
  coherence: Float32Array,
  fftSize: number,
  targetType: TargetCurveType = 'flat',
  threshold: number = 3
): CorrectionAnalysis {
  const bins = magnitude.length;

  // Generate target curve
  const target = generateTargetCurve(targetType, bins, fftSize);

  // Detect peaks and dips
  const detectedPeaks = detectPeaksAndDips(magnitude, target, coherence, fftSize, threshold);

  // Build problem diagnoses
  const problems: ProblemDiagnosis[] = detectedPeaks.map((peak, index) => {
    const problemType = classifyProblem(peak);
    const eqSolution = generateEQSolution(peak);
    const acousticSolution = generateAcousticSolution(peak, problemType);
    const { recommendEQ, recommendAcoustic } = getRecommendations(
      problemType,
      peak.q,
      peak.magnitude
    );

    return {
      id: `problem-${index}`,
      frequency: peak.frequency,
      magnitude: peak.magnitude,
      bandwidth: peak.bandwidth,
      q: peak.q,
      type: problemType,
      confidence: coherence[peak.binIndex] || 0.5,
      eqSolution,
      acousticSolution,
      recommendEQ,
      recommendAcoustic,
    };
  });

  // Calculate overall deviation (RMS)
  let sumSq = 0;
  let validBins = 0;
  for (let i = 0; i < bins; i++) {
    const freq = (i * SAMPLE_RATE) / fftSize;
    if (freq >= 20 && freq <= 20000 && coherence[i] > 0.5) {
      const diff = magnitude[i] - target[i];
      sumSq += diff * diff;
      validBins++;
    }
  }
  const overallDeviation = validBins > 0 ? Math.sqrt(sumSq / validBins) : 0;

  // Count issues
  const eqBandsNeeded = problems.filter(p => p.recommendEQ).length;
  const acousticIssuesCount = problems.filter(p => p.recommendAcoustic).length;

  // Generate summary
  let summary = '';
  if (problems.length === 0) {
    summary = 'Response is within target tolerance. No corrections needed.';
  } else if (acousticIssuesCount === 0) {
    summary = `${eqBandsNeeded} issue(s) can be corrected with EQ.`;
  } else if (eqBandsNeeded === 0) {
    summary = `${acousticIssuesCount} issue(s) require acoustic treatment.`;
  } else {
    summary = `${eqBandsNeeded} EQ correction(s) recommended, ${acousticIssuesCount} acoustic issue(s) detected.`;
  }

  return {
    problems,
    targetCurve: targetType,
    overallDeviation: Math.round(overallDeviation * 10) / 10,
    eqBandsNeeded,
    acousticIssuesCount,
    summary,
  };
}

// ─── Export EQ to Various Formats ────────────────────────────────────────────

/**
 * Generate EQ settings as copyable text.
 */
export function exportEQAsText(problems: ProblemDiagnosis[]): string {
  const eqBands = problems
    .filter(p => p.recommendEQ)
    .map(p => p.eqSolution);

  if (eqBands.length === 0) {
    return 'No EQ corrections needed.';
  }

  let text = 'EQ CORRECTION SETTINGS\n';
  text += '======================\n\n';
  text += 'Band | Freq (Hz) | Gain (dB) | Q    | Type\n';
  text += '-----|-----------|-----------|------|----------\n';

  eqBands.forEach((band, i) => {
    const freq = band.freq.toString().padStart(9);
    const gain = (band.gain >= 0 ? '+' : '') + band.gain.toFixed(1).padStart(8);
    const q = band.q.toFixed(1).padStart(4);
    text += `  ${i + 1}  | ${freq} | ${gain} | ${q} | ${band.type}\n`;
  });

  return text;
}

/**
 * Generate acoustic treatment report.
 */
export function exportAcousticReport(problems: ProblemDiagnosis[]): string {
  const acousticProblems = problems.filter(p => p.recommendAcoustic);

  if (acousticProblems.length === 0) {
    return 'No acoustic treatment recommended.';
  }

  let text = 'ACOUSTIC TREATMENT RECOMMENDATIONS\n';
  text += '==================================\n\n';

  acousticProblems.forEach((problem, i) => {
    const sol = problem.acousticSolution;
    text += `${i + 1}. ${sol.description}\n`;
    text += `   Location: ${sol.location}\n`;
    text += `   Expected improvement: ~${sol.estimatedImprovement.toFixed(0)} dB\n`;
    text += `   Difficulty: ${sol.difficulty} | Cost: ${sol.cost}\n\n`;
  });

  return text;
}
