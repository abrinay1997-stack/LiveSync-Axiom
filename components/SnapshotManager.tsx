
import React, { useState } from 'react';
import { Layers, Scissors, Eye, EyeOff, Check, History, Camera } from 'lucide-react';
import { TraceData } from '../types';

interface SnapshotManagerProps {
  traces: TraceData[];
  onCapture: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  isEngineStarted: boolean;
}

const SnapshotManager: React.FC<SnapshotManagerProps> = ({ 
  traces, onCapture, onDelete, onRename, onToggleVisibility, isEngineStarted 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (trace: TraceData) => {
    setEditingId(trace.id);
    setEditValue(trace.name);
  };

  const saveEdit = () => {
    if (editingId) {
      onRename(editingId, editValue);
      setEditingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-hidden">
      
      {/* Botón de Captura Superior */}
      <button 
        onClick={onCapture} 
        disabled={!isEngineStarted}
        className="shrink-0 w-full py-3.5 bg-white text-black disabled:opacity-20 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 hover:bg-cyan-400 shadow-xl flex items-center justify-center gap-2 group"
      >
        <Camera size={14} className="group-hover:rotate-12 transition-transform" /> 
        TAKE SCREENSHOT
      </button>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 space-y-2">
        {traces.length > 0 ? (
          [...traces].reverse().map(t => (
            <div key={t.id} className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5 group transition-all hover:border-white/20 hover:bg-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div 
                    className="w-1.5 h-6 rounded-full shrink-0 shadow-[0_0_10px]" 
                    style={{ backgroundColor: t.color, color: t.color }} 
                  />
                  
                  {editingId === t.id ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input 
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        onBlur={saveEdit}
                        className="bg-black border border-cyan-500/50 rounded px-2 py-1 text-[10px] mono text-white w-full outline-none"
                      />
                      <button onClick={saveEdit} className="text-emerald-400 p-0.5"><Check size={14}/></button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-bold truncate text-slate-300 group-hover:text-white transition-colors cursor-pointer" onClick={() => startEditing(t)}>
                        {t.name}
                      </span>
                      <span className="text-[8px] mono text-slate-600">
                        {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-black/60 rounded-lg p-0.5 ml-1 border border-white/5">
                  <button onClick={() => onToggleVisibility(t.id)} className={`p-1 rounded-md transition-colors ${t.visible ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-slate-600 hover:bg-white/10'}`}>
                    {t.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                  </button>
                  <button onClick={() => onDelete(t.id)} className="p-1 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-md">
                    <Scissors size={12}/>
                  </button>
                </div>
              </div>

              {t.metadata && !editingId && (
                <div className="flex gap-2 pl-4">
                   <div className="px-1.5 py-0.5 bg-cyan-500/5 border border-cyan-500/10 rounded text-[8px] mono text-cyan-400/60">
                     {t.metadata.peakFreq.toFixed(0)} Hz
                   </div>
                   <div className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] mono text-slate-500">
                     {t.metadata.avgLevel.toFixed(1)} dB
                   </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 gap-3 border-2 border-dashed border-white/5 rounded-2xl h-full">
            <Layers size={32} strokeWidth={1} />
            <p className="text-[9px] uppercase font-bold tracking-[0.3em] text-center leading-relaxed">
              NO SNAPSHOTS<br/>SAVED
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-2 border-t border-white/5 flex justify-between items-center px-1">
         <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{traces.length} Captures Total</span>
         <span className="text-[8px] mono text-slate-700">Storage Ready</span>
      </div>
    </div>
  );
};

export default SnapshotManager;
