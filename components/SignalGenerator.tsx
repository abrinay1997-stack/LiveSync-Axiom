
import React, { useState } from 'react';
import { Volume2, VolumeX, Radio, Settings2 } from 'lucide-react';
import { generatorEngine } from '../services/GeneratorEngine';

const SignalGenerator: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gain, setGain] = useState(-12);

  const togglePinkNoise = async () => {
    if (isPlaying) {
      generatorEngine.stop();
      setIsPlaying(false);
    } else {
      await generatorEngine.startPinkNoise();
      generatorEngine.setGain(Math.pow(10, gain / 20));
      setIsPlaying(true);
    }
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
          <Radio size={14} className="text-emerald-400" />
          Signal Gen
        </h3>
        <Settings2 size={12} className="text-slate-600" />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={togglePinkNoise}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.98] ${
            isPlaying 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${isPlaying ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500'}`}>
              <Radio size={16} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider">Pink Noise</div>
              <div className="text-[9px] text-slate-600 mono">-3dB / Octave</div>
            </div>
          </div>
          {isPlaying ? <Volume2 size={16} className="animate-pulse" /> : <VolumeX size={16} className="text-slate-700" />}
        </button>
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
