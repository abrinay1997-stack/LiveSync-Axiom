
import React from 'react';
import { Activity, Clock, RotateCcw, Maximize2, Minimize2, PlusSquare } from 'lucide-react';
import RTADisplay from '../RTADisplay';
import SpectrogramDisplay from '../SpectrogramDisplay';
import TransferDisplay from '../TransferDisplay';
import ImpulseDisplay from '../ImpulseDisplay';
import { useMeasurement } from '../../context/MeasurementContext';

interface MainStageProps {
  activeTab: string;
  bottomVisible: boolean;
}

const MainStage: React.FC<MainStageProps> = ({ activeTab, bottomVisible }) => {
  const { config, traces, setSmoothing, updateConfig, analysis, audioSystem } = useMeasurement();
  const isStarted = audioSystem.isStarted;

  return (
    <section className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-[#080808]">
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {activeTab === 'rta' && (
          <>
            <RTADisplay config={config} isActive={isStarted} traces={traces} />
            <SpectrogramDisplay config={config} isActive={isStarted} />
          </>
        )}
        {activeTab === 'tf' && <TransferDisplay config={config} isActive={isStarted} traces={traces} />}
        {activeTab === 'impulse' && <ImpulseDisplay isActive={isStarted} />}
      </div>

      {bottomVisible && (activeTab === 'rta' || activeTab === 'tf' || activeTab === 'impulse') && (
        <div className="h-16 bg-black border border-white/5 rounded-xl flex items-center px-6 gap-8 shrink-0 shadow-2xl overflow-x-auto custom-scrollbar animate-slide-up">
          <div className="flex flex-col gap-1 pr-8 border-r border-white/5 shrink-0" title="Suavizado espectral: mayor fraccion = mas detalle, menor = curva mas suave">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Smoothing</span>
            <div className="flex gap-1">
              {(['none', '1/3', '1/12', '1/48'] as const).map(s => (
                <button key={s} onClick={() => setSmoothing(s)} title={s === 'none' ? 'Sin suavizado - maxima resolucion' : `Suavizado ${s} octava`} className={`px-3 py-1 rounded-md text-[9px] font-bold border transition-all ${config.smoothing === s ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pr-8 border-r border-white/5 shrink-0">
             <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">dB Range</span>
                <div className="flex gap-3">
                   <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 gap-2" title="Limite superior del grafico (dB)"><Maximize2 size={12} className="text-cyan-400"/><input type="number" value={config.maxDb} onChange={(e) => { const v = Math.max(-50, Math.min(20, parseInt(e.target.value) || 0)); updateConfig({ maxDb: v }); }} className="bg-transparent text-[11px] mono text-white font-bold w-12 outline-none text-center" /></div>
                   <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 gap-2" title="Limite inferior del grafico (dB) - reduce para ver mas rango dinamico"><Minimize2 size={12} className="text-rose-400"/><input type="number" value={config.minDb} onChange={(e) => { const v = Math.max(-150, Math.min(-20, parseInt(e.target.value) || -110)); updateConfig({ minDb: v }); }} className="bg-transparent text-[11px] mono text-white font-bold w-12 outline-none text-center" /></div>
                </div>
             </div>
             <div className="flex flex-col gap-1" title="Ganancia visual: sube para ver senales debiles sin afectar la medicion real">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Visual Gain</span>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 gap-3">
                   <PlusSquare size={12} className="text-amber-500"/><input type="range" min="0" max="60" step="1" value={config.visualGain} onChange={(e) => updateConfig({ visualGain: parseInt(e.target.value) })} className="w-24 h-1 bg-slate-800 rounded-full appearance-none accent-amber-500" />
                   <div className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><span className="text-[11px] font-black mono text-amber-500 text-center">+{config.visualGain}dB</span></div>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Alignment</span>
             <div className="flex items-center gap-3">
                <button onClick={analysis.runAutoDelay} disabled={!isStarted} title="Detecta automaticamente el delay entre referencia y medicion usando correlacion cruzada (requiere 2 canales)" className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-20"><Activity size={14} /> FIND DELAY</button>
                {analysis.delayData && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-black border border-white/10 rounded-lg" title="Delay detectado entre referencia y microfono"><Clock size={12} className="text-cyan-400" /><span className="text-[11px] mono font-bold text-white">{analysis.delayData.ms.toFixed(2)}ms</span></div>
                )}
             </div>
          </div>

          <div className="ml-auto flex items-center gap-8 shrink-0 border-l border-white/5 pl-8">
             <button onClick={analysis.resetAnalysis} title="Reiniciar analisis y promedios" className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><RotateCcw size={16} /></button>
          </div>
        </div>
      )}
    </section>
  );
};

export default MainStage;
