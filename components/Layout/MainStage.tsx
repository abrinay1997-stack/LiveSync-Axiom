
import React from 'react';
import { Activity, Clock, Wand2, RotateCcw, Command } from 'lucide-react';
import RTADisplay from '../RTADisplay';
import SpectrogramDisplay from '../SpectrogramDisplay';
import TransferDisplay from '../TransferDisplay';
import ImpulseDisplay from '../ImpulseDisplay';
import WatermarkPanel from '../WatermarkPanel';
import { MeasurementConfig, TraceData } from '../../types';

interface MainStageProps {
  activeTab: string;
  isStarted: boolean;
  config: MeasurementConfig;
  traces: TraceData[];
  setSmoothing: (s: any) => void;
  analysis: {
    isAnalyzing: boolean;
    delayData: { ms: number, m: number } | null;
    runAutoDelay: () => void;
    generateCorrection: () => void;
    resetAnalysis: () => void;
  };
}

const MainStage: React.FC<MainStageProps> = ({ 
  activeTab, isStarted, config, traces, setSmoothing, analysis 
}) => {
  return (
    <section className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        {activeTab === 'rta' && (
          <>
            <RTADisplay config={config} isActive={isStarted} traces={traces} />
            <SpectrogramDisplay config={config} isActive={isStarted} />
          </>
        )}
        {activeTab === 'tf' && <TransferDisplay config={config} isActive={isStarted} traces={traces} />}
        {activeTab === 'impulse' && <ImpulseDisplay isActive={isStarted} />}
        {activeTab === 'security' && <WatermarkPanel />}
      </div>

      {(activeTab === 'rta' || activeTab === 'tf' || activeTab === 'impulse') && (
        <div className="flex gap-6 items-center bg-[#0f0f0f] border border-white/10 p-4 rounded-2xl shrink-0 shadow-2xl relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 left-0 w-full h-px bg-white/5"></div>
          
          <div className="flex gap-2 items-center px-4 border-r border-white/5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Smoothing</span>
            {(['none', '1/3', '1/12', '1/48'] as const).map(s => (
              <button 
                key={s} 
                onClick={() => setSmoothing(s)} 
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${config.smoothing === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          {(activeTab === 'tf' || activeTab === 'impulse') && (
            <div className="flex items-center gap-4 px-4 border-r border-white/5">
              <button 
                onClick={analysis.runAutoDelay} 
                disabled={analysis.isAnalyzing || !isStarted}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${analysis.isAnalyzing ? 'bg-cyan-500/50 text-white animate-pulse' : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-400'}`}
              >
                <Activity size={14} /> {analysis.isAnalyzing ? 'Analyzing...' : 'Auto-Delay (D)'}
              </button>
              
              {activeTab === 'tf' && (
                <button 
                  onClick={analysis.generateCorrection} 
                  disabled={!isStarted}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black hover:bg-emerald-400 transition-all active:scale-95"
                >
                  <Wand2 size={14} /> Correction (E)
                </button>
              )}

              {analysis.delayData && (
                <div className="flex items-center gap-3 px-5 py-2 bg-black rounded-xl border border-white/10">
                   <Clock size={14} className="text-cyan-400" />
                   <div className="flex gap-4 mono font-black">
                     <span className="text-white text-xs">{analysis.delayData.ms.toFixed(2)}ms</span>
                     <span className="text-slate-600 text-[10px]">{analysis.delayData.m.toFixed(2)}m</span>
                   </div>
                </div>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-6">
             <div className="hidden xl:flex items-center gap-3 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                <Command size={12} />
                <span>Space: Capture | R: Reset | B: Sidebar</span>
             </div>
             <button 
              onClick={analysis.resetAnalysis}
              className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all" 
              title="Reset (R)"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default MainStage;
