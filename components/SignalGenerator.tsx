
import React, { useState } from 'react';
import { Volume2, VolumeX, Zap, Radio } from 'lucide-react';
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
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} className="text-emerald-400" />
          Signal Generator
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={togglePinkNoise}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
            isPlaying 
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <Radio size={18} />
            <div className="text-left">
              <div className="text-sm font-semibold">Pink Noise</div>
              <div className="text-[10px] text-slate-500">-3dB / Octave</div>
            </div>
          </div>
          {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-600" />}
        </button>
      </div>
      
      <div className="pt-2 px-1">
        <div className="flex justify-between items-center mb-1">
          <label className="text-[10px] text-slate-500 uppercase">Output Gain</label>
          <span className="text-[10px] mono text-slate-400">{gain.toFixed(1)} dB</span>
        </div>
        <input 
          type="range" 
          min="-60" max="0" step="0.5"
          value={gain}
          onChange={handleGainChange}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>
    </div>
  );
};

export default SignalGenerator;
