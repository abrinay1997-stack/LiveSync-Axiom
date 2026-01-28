
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Zap, Info, Search, Activity, Lock, Unlock } from 'lucide-react';
import { WatermarkEngine } from '../services/WatermarkEngine';
import { audioEngine } from '../services/AudioEngine';

const WatermarkPanel: React.FC = () => {
  const [alpha, setAlpha] = useState(0.005);
  const [key, setKey] = useState(12345);
  const [lastScore, setLastScore] = useState<number>(0);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<number[]>([]);
  
  const scanIntervalRef = useRef<number | undefined>(undefined);

  const toggleLiveScan = () => {
    if (isLiveScanning) {
      clearInterval(scanIntervalRef.current);
      setIsLiveScanning(false);
    } else {
      setIsLiveScanning(true);
      scanIntervalRef.current = window.setInterval(() => {
        const samples = audioEngine.getLiveSamples();
        if (samples && samples.length > 1024) {
          const score = WatermarkEngine.extract(samples, key);
          setLastScore(score);
          setDetectionHistory(prev => [...prev.slice(-20), score]);
        }
      }, 100);
    }
  };

  useEffect(() => {
    return () => clearInterval(scanIntervalRef.current);
  }, []);

  const isDetected = lastScore > 0.05;

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border transition-colors ${isDetected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              <Shield className={isDetected ? 'text-emerald-400' : 'text-rose-400'} size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stream Security Scanner</h3>
              <p className="text-[10px] text-slate-500 mono uppercase tracking-tighter">DSSS Extraction / Confidence: {(lastScore * 100).toFixed(1)}%</p>
            </div>
          </div>

          <button 
            onClick={toggleLiveScan}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLiveScanning ? 'bg-rose-500 text-white animate-pulse' : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'}`}
          >
            {isLiveScanning ? <Activity size={14}/> : <Search size={14}/>}
            {isLiveScanning ? 'STOP SCAN' : 'START LIVE SCAN'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          <div className="space-y-6">
             <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-black mb-3 block flex items-center gap-2">
                    <Key size={12} className="text-cyan-400" /> Decryption Key
                  </label>
                  <input 
                    type="number" 
                    value={key}
                    onChange={(e) => setKey(parseInt(e.target.value))}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-cyan-400 outline-none focus:border-cyan-500/50 mono font-bold"
                  />
                </div>

                <div className="pt-2">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Detection Threshold</span>
                      <span className="text-[10px] mono text-emerald-400">0.05 Score</span>
                   </div>
                   <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, lastScore * 500)}%` }} />
                   </div>
                </div>
             </div>

             <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-5 flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${isDetected ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800 border-white/5'}`}>
                   {isDetected ? <Lock className="text-emerald-400" size={24}/> : <Unlock className="text-slate-600" size={24}/>}
                </div>
                <div>
                   <h4 className={`text-xs font-black uppercase ${isDetected ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isDetected ? 'AUTHENTICATED SIGNAL' : 'NO MARK DETECTED'}
                   </h4>
                   <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                      {isDetected 
                        ? 'La firma digital DSSS ha sido validada mediante correlación cruzada en la subbanda Wavelet.' 
                        : 'El sistema está monitoreando el espectro en busca de secuencias PN autorizadas.'}
                   </p>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-4">
             <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-4 flex flex-col relative overflow-hidden">
                <span className="text-[8px] font-bold text-slate-600 uppercase absolute top-4 left-4">Correlation History</span>
                <div className="flex-1 flex items-end gap-1 px-2 pt-6">
                   {detectionHistory.map((h, i) => (
                     <div 
                        key={i} 
                        className={`flex-1 rounded-t-sm transition-all duration-300 ${h > 0.05 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-800'}`}
                        style={{ height: `${Math.min(100, h * 600)}%` }}
                     />
                   ))}
                </div>
             </div>
             
             <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4">
                <Info size={18} className="text-blue-400 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                   <strong>Principio DSSS:</strong> La marca es inyectada mediante ensanchamiento de espectro. El receptor debe conocer la clave PN exacta para colapsar la energía y extraer el bit de información.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatermarkPanel;
