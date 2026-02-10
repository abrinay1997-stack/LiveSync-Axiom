
import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Building2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import type { CorrectionAnalysis, ProblemDiagnosis, TargetCurveType } from '../types';
import {
  analyzeCorrections,
  exportEQAsText,
  exportAcousticReport,
} from '../services/CorrectionAnalyzer';

interface CorrectionPanelProps {
  magnitude: Float32Array;
  coherence: Float32Array;
  fftSize: number;
  isActive: boolean;
}

type ViewMode = 'both' | 'eq' | 'acoustic';

const CorrectionPanel: React.FC<CorrectionPanelProps> = ({
  magnitude,
  coherence,
  fftSize,
  isActive,
}) => {
  const [targetCurve, setTargetCurve] = useState<TargetCurveType>('flat');
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [threshold, setThreshold] = useState(3);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [copiedEQ, setCopiedEQ] = useState(false);
  const [copiedAcoustic, setCopiedAcoustic] = useState(false);

  // Analyze corrections
  const analysis = useMemo<CorrectionAnalysis | null>(() => {
    if (!isActive || magnitude.length === 0 || coherence.length === 0) {
      return null;
    }
    return analyzeCorrections(magnitude, coherence, fftSize, targetCurve, threshold);
  }, [magnitude, coherence, fftSize, targetCurve, threshold, isActive]);

  // Filter problems based on view mode
  const filteredProblems = useMemo(() => {
    if (!analysis) return [];
    switch (viewMode) {
      case 'eq':
        return analysis.problems.filter(p => p.recommendEQ);
      case 'acoustic':
        return analysis.problems.filter(p => p.recommendAcoustic);
      default:
        return analysis.problems;
    }
  }, [analysis, viewMode]);

  // Copy handlers
  const handleCopyEQ = () => {
    if (!analysis) return;
    const text = exportEQAsText(analysis.problems);
    navigator.clipboard.writeText(text);
    setCopiedEQ(true);
    setTimeout(() => setCopiedEQ(false), 2000);
  };

  const handleCopyAcoustic = () => {
    if (!analysis) return;
    const text = exportAcousticReport(analysis.problems);
    navigator.clipboard.writeText(text);
    setCopiedAcoustic(true);
    setTimeout(() => setCopiedAcoustic(false), 2000);
  };

  // Format frequency for display
  const formatFreq = (freq: number) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return Math.round(freq).toString();
  };

  // Get icon for problem type
  const getProblemIcon = (problem: ProblemDiagnosis) => {
    if (problem.recommendAcoustic && !problem.recommendEQ) {
      return <AlertTriangle size={12} className="text-amber-400" />;
    }
    if (problem.recommendEQ && !problem.recommendAcoustic) {
      return <CheckCircle size={12} className="text-emerald-400" />;
    }
    return <Info size={12} className="text-cyan-400" />;
  };

  // Get problem type label
  const getProblemLabel = (type: string) => {
    const labels: Record<string, string> = {
      room_mode: 'Room Mode',
      sbir: 'SBIR',
      comb_filter: 'Comb Filter',
      absorption: 'Absorption',
      coverage: 'Coverage',
      eq_able: 'EQ-able',
    };
    return labels[type] || type;
  };

  if (!isActive) {
    return (
      <div className="bg-black/50 border border-white/5 rounded-xl p-4 text-center">
        <span className="text-[10px] text-slate-500">Start measurement to analyze corrections</span>
      </div>
    );
  }

  return (
    <div className="bg-black/50 border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-black/30 border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Correction Analysis
          </h3>
          {analysis && (
            <span className="text-[9px] text-slate-500">
              {analysis.overallDeviation.toFixed(1)} dB RMS deviation
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-white/5 space-y-3">
        {/* Target Curve Selector */}
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-bold text-slate-500 uppercase w-20">Target</span>
          <div className="flex gap-1">
            {(['flat', 'house', 'x-curve'] as TargetCurveType[]).map(curve => (
              <button
                key={curve}
                onClick={() => setTargetCurve(curve)}
                className={`px-3 py-1 rounded text-[9px] font-bold border transition-all ${
                  targetCurve === curve
                    ? 'bg-cyan-500 border-cyan-500 text-black'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                }`}
              >
                {curve === 'flat' ? 'Flat' : curve === 'house' ? 'House' : 'X-Curve'}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-bold text-slate-500 uppercase w-20">Show</span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1 rounded text-[9px] font-bold border transition-all ${
                viewMode === 'both'
                  ? 'bg-purple-500 border-purple-500 text-black'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setViewMode('eq')}
              className={`px-3 py-1 rounded text-[9px] font-bold border transition-all flex items-center gap-1 ${
                viewMode === 'eq'
                  ? 'bg-emerald-500 border-emerald-500 text-black'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
              }`}
            >
              <Sliders size={10} /> EQ
            </button>
            <button
              onClick={() => setViewMode('acoustic')}
              className={`px-3 py-1 rounded text-[9px] font-bold border transition-all flex items-center gap-1 ${
                viewMode === 'acoustic'
                  ? 'bg-amber-500 border-amber-500 text-black'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
              }`}
            >
              <Building2 size={10} /> Acoustic
            </button>
          </div>
        </div>

        {/* Threshold */}
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-bold text-slate-500 uppercase w-20">Threshold</span>
          <input
            type="range"
            min="1"
            max="6"
            step="0.5"
            value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            className="w-24 h-1 bg-slate-800 rounded-full appearance-none accent-cyan-500"
          />
          <span className="text-[9px] mono text-slate-400">{threshold} dB</span>
        </div>
      </div>

      {/* Summary */}
      {analysis && (
        <div className="px-4 py-2 bg-black/20 border-b border-white/5">
          <p className="text-[9px] text-slate-400">{analysis.summary}</p>
        </div>
      )}

      {/* Problems List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredProblems.length === 0 ? (
          <div className="p-4 text-center">
            <CheckCircle size={20} className="mx-auto text-emerald-500 mb-2" />
            <span className="text-[10px] text-slate-500">
              {analysis ? 'No issues detected above threshold' : 'Analyzing...'}
            </span>
          </div>
        ) : (
          filteredProblems.map(problem => (
            <div
              key={problem.id}
              className="border-b border-white/5 last:border-0"
            >
              {/* Problem Header */}
              <button
                onClick={() => setExpandedProblem(
                  expandedProblem === problem.id ? null : problem.id
                )}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                {getProblemIcon(problem)}
                <span className="text-[11px] font-bold text-white mono">
                  {formatFreq(problem.frequency)} Hz
                </span>
                <span className={`text-[10px] font-bold ${
                  problem.magnitude > 0 ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  {problem.magnitude > 0 ? '+' : ''}{problem.magnitude.toFixed(1)} dB
                </span>
                <span className="text-[8px] text-slate-500 uppercase">
                  {getProblemLabel(problem.type)}
                </span>
                <span className="text-[8px] text-slate-600 ml-auto">
                  Q{problem.q.toFixed(1)}
                </span>
                {expandedProblem === problem.id ? (
                  <ChevronUp size={12} className="text-slate-500" />
                ) : (
                  <ChevronDown size={12} className="text-slate-500" />
                )}
              </button>

              {/* Expanded Details */}
              {expandedProblem === problem.id && (
                <div className="px-4 pb-3 space-y-3">
                  {/* EQ Solution */}
                  {(viewMode === 'both' || viewMode === 'eq') && problem.recommendEQ && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sliders size={12} className="text-emerald-400" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">
                          EQ Correction
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">Freq</span>
                          <span className="text-white font-bold mono">
                            {problem.eqSolution.freq} Hz
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Gain</span>
                          <span className="text-white font-bold mono">
                            {problem.eqSolution.gain > 0 ? '+' : ''}
                            {problem.eqSolution.gain.toFixed(1)} dB
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Q</span>
                          <span className="text-white font-bold mono">
                            {problem.eqSolution.q.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Type</span>
                          <span className="text-white font-bold capitalize">
                            {problem.eqSolution.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acoustic Solution */}
                  {(viewMode === 'both' || viewMode === 'acoustic') && problem.recommendAcoustic && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 size={12} className="text-amber-400" />
                        <span className="text-[9px] font-bold text-amber-400 uppercase">
                          Acoustic Treatment
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mb-2">
                        {problem.acousticSolution.description}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        <strong>Location:</strong> {problem.acousticSolution.location}
                      </p>
                      <div className="flex gap-4 mt-2 text-[8px] text-slate-500">
                        <span>Est. improvement: ~{problem.acousticSolution.estimatedImprovement} dB</span>
                        <span>Difficulty: {problem.acousticSolution.difficulty}</span>
                        <span>Cost: {problem.acousticSolution.cost}</span>
                      </div>
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-slate-500">Confidence:</span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${problem.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-slate-500">
                      {(problem.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Export Buttons */}
      {analysis && analysis.problems.length > 0 && (
        <div className="px-4 py-3 border-t border-white/5 flex gap-2">
          <button
            onClick={handleCopyEQ}
            disabled={analysis.eqBandsNeeded === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copiedEQ ? <Check size={12} /> : <Copy size={12} />}
            {copiedEQ ? 'Copied!' : 'Copy EQ Settings'}
          </button>
          <button
            onClick={handleCopyAcoustic}
            disabled={analysis.acousticIssuesCount === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[9px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copiedAcoustic ? <Check size={12} /> : <Copy size={12} />}
            {copiedAcoustic ? 'Copied!' : 'Copy Treatment Report'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CorrectionPanel;
