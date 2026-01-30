
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Radio, Settings2, Waves, Zap, Camera } from 'lucide-react';
import { generatorEngine } from '../services/GeneratorEngine';
import { useMeasurement } from '../context/MeasurementContext';
import { audioEngine } from '../services/AudioEngine';

const SignalGenerator: React.FC = () => {
  const { captureTrace } = useMeasurement();
  const [isPlayingPink, setIsPlayingPink] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [syncCapture, setSyncCapture] = useState(true);
  const [gain, setGain] = useState(-12);

  const togglePinkNoise = async () => {
    if (isPlayingPink) {
      generatorEngine.stop();
      setIsPlayingPink(false);
    } else {
      setIsSweeping(false);
      await generatorEngine.startPinkNoise();
      generatorEngine.setGain(Math.pow(10, gain / 20));
      setIsPlayingPink(true);
    }
  };

  const startSweep = async () => {
    // 1. Aseguramos que nada más esté sonando
    generatorEngine.stop();
    setIsPlayingPink(false);
    setIsSweeping(true);
    
    // 2. Iniciamos el motor de captura Peak-Hold antes de lanzar el audio
    if (syncCapture) {
      audioEngine.startSweepCapture();
    }

    // 3. Pre-roll de seguridad (100ms) para que el motor de captura esté "caliente"
    setTimeout(async () => {
      const duration = 3.0;
      await generatorEngine.playSineSweep(duration);
      
      // 4. Post-roll (esperamos que termine el audio y un poco más para reflexiones finales)
      setTimeout(() => {
        setIsSweeping(false);
        
        if (syncCapture) {
          const sweepData = audioEngine.stopSweepCapture();
          // Inyectamos los datos capturados durante todo el barrido
          (window as any).Axiom_LastSweepData = sweepData;
          captureTrace(); 
        }
      }, (duration * 1000) + 300);
    }, 100);
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setGain(val);
    generatorEngine.setGain(Math.pow(10, val / 20));
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-emerald-500/20"></div>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
          <Waves size={14} className="text-emerald-400" />
          Acoustic Sources
        </h3>
        <Settings2 size={12} className="text-slate-600" />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={togglePinkNoise}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
            isPlayingPink 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${isPlayingPink ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500'}`}>
              <Radio size={16} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider">Pink Noise</div>
              <div className="text-[9px] text-slate-600 mono">RTA / Realtime</div>
            </div>
          </div>
          {isPlayingPink ? <Volume2 size={16} className="animate-pulse" /> : <VolumeX size={16} className="text-slate-700" />}
        </button>

        <div className="space-y-2">
          <button
            onClick={startSweep}
            disabled={isSweeping}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
              isSweeping 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${isSweeping ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                <Zap size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider">Sine Sweep</div>
                <div className="text-[9px] text-slate-600 mono">Precision Capture</div>
              </div>
            </div>
            {isSweeping ? (
              <div className="flex items-center gap-2">
                 <span className="text-[8px] mono font-bold animate-pulse">SWEEPING...</span>
                 <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </div>
            ) : <Camera size={14} className={syncCapture ? "text-cyan-500 opacity-60" : "text-slate-700"} />}
          </button>
          
          <button 
            onClick={() => setSyncCapture(!syncCapture)}
            className={`w-full py-1 text-[8px] font-black uppercase tracking-widest border border-dashed rounded-lg transition-colors ${syncCapture ? 'border-cyan-500/30 text-cyan-400 bg-cyan-400/5' : 'border-white/5 text-slate-600'}`}
          >
            {syncCapture ? 'Auto-Capture Enabled' : 'Auto-Capture Disabled'}
          </button>
        </div>
      </div>
      
      <div className="pt-2 px-1 space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[9px] text-slate-500 uppercase font-black">Output Gain</label>
          <span className="text-[10px] mono text-emerald-400 font-bold">{gain.toFixed(1)} dB</span>
        </div>
        <input 
          type="range" 
          min="-60" max="0" step="0.5"
          value={gain}
          onChange={handleGainChange}
          className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>
    </div>
  );
};

export default SignalGenerator;
