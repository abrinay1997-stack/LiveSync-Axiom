
import React, { useState } from 'react';
import { Shield, Key, Zap, Info, Download, Search } from 'lucide-react';
import { WatermarkEngine } from '../services/WatermarkEngine';
import { audioEngine } from '../services/AudioEngine';

const WatermarkPanel: React.FC = () => {
  const [alpha, setAlpha] = useState(0.005);
  const [key, setKey] = useState(12345);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [psnr, setPsnr] = useState<number | null>(null);

  const testEmbedding = () => {
    // Generamos un buffer de prueba (o usamos el del generador de ruido)
    const duration = 1; // 1 segundo
    const size = 48000 * duration;
    const original = new Float32Array(size);
    for(let i=0; i<size; i++) original[i] = Math.random() * 2 - 1;

    const watermarked = WatermarkEngine.embed(original, alpha, key);
    const score = WatermarkEngine.extract(watermarked, key);
    const calculatedPsnr = WatermarkEngine.calculatePSNR(original, watermarked);

    setLastScore(score);
    setPsnr(calculatedPsnr);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <Shield className="text-rose-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Audio Watermarking (DSSS)</h3>
              <p className="text-[10px] text-slate-500 mono uppercase">DWT Haar Level 2 / PN Antipodal</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block flex items-center gap-1">
                <Zap size={10} className="text-amber-500" /> Embedding Intensity (α)
              </label>
              <input 
                type="range" 
                min="0.001" 
                max="0.05" 
                step="0.001"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between mt-1 text-[10px] mono text-slate-400">
                <span>Inaudible</span>
                <span className="text-rose-400 font-bold">{alpha.toFixed(4)}</span>
                <span>Robust</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block flex items-center gap-1">
                <Key size={10} className="text-cyan-500" /> Security Key
              </label>
              <input 
                type="number" 
                value={key}
                onChange={(e) => setKey(parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-cyan-400 outline-none focus:border-cyan-500/50 mono"
              />
            </div>

            <button 
              onClick={testEmbedding}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} /> Run Test Simulation
            </button>
          </div>

          <div className="bg-black/20 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-500 uppercase">Detection Score</span>
                <span className={`text-lg mono font-bold ${lastScore && lastScore > 0.001 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {lastScore ? lastScore.toFixed(6) : '---'}
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-500 uppercase">Transparency (PSNR)</span>
                <span className={`text-lg mono font-bold ${psnr && psnr > 40 ? 'text-cyan-400' : 'text-amber-500'}`}>
                  {psnr ? `${psnr.toFixed(1)} dB` : '---'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lastScore && lastScore > 0.001 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                  {lastScore && lastScore > 0.001 ? 'MARK DETECTED' : 'IDLE / NO MARK'}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
              <Info size={16} className="text-blue-400 shrink-0" />
              <p className="text-[9px] text-slate-400 leading-tight">
                El motor DSSS inserta una secuencia PN antipodal en la subbanda cD2 del dominio Wavelet. 
                Esto garantiza resiliencia contra compresión y ruido gaussiano sin comprometer la fase.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 h-32">
        <button className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 hover:bg-slate-800/60 transition-all flex flex-col items-center justify-center gap-2 group">
          <Download className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          <span className="text-[10px] text-slate-400 uppercase font-bold">Process & Export</span>
        </button>
        <button className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 hover:bg-slate-800/60 transition-all flex flex-col items-center justify-center gap-2 group">
          <Search className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
          <span className="text-[10px] text-slate-400 uppercase font-bold">Live Scan</span>
        </button>
        <button className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 hover:bg-slate-800/60 transition-all flex flex-col items-center justify-center gap-2 group">
          <Shield className="text-slate-500 group-hover:text-rose-400 transition-colors" />
          <span className="text-[10px] text-slate-400 uppercase font-bold">Anti-Piracy Log</span>
        </button>
      </div>
    </div>
  );
};

export default WatermarkPanel;
