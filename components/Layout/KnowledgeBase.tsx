
import React from 'react';
import { X, BookOpen, HelpCircle, ArrowRight, Mic, Cable, Play, Info, Waves, Zap } from 'lucide-react';

interface KnowledgeBaseProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ activeTab, isOpen, onClose }) => {
  if (!isOpen) return null;

  const getContent = () => {
    switch (activeTab) {
      case 'rta':
        return {
          title: 'Real Time Analyzer (RTA)',
          steps: [
            'Usa PINK NOISE para una respuesta de frecuencia constante por octava.',
            'Conecta tu micrófono de medición al Canal 2.',
            'Presiona "RUN ENGINE" para iniciar la captura.',
            'Ajusta el "Visual Gain" para alinear la traza con el suelo de ruido.'
          ],
          tips: 'El RTA es ideal para ajustes tonales rápidos y balance de EQ general usando ruido rosa.',
          setup: 'Pink Noise -> Speaker -> Mic'
        };
      case 'tf':
        return {
          title: 'Transfer Function (TF)',
          steps: [
            'Loopback: Salida Consola -> Canal 1 (Referencia).',
            'Medición: Micrófono -> Canal 2 (Medición).',
            'Usa PINK NOISE para comparar espectros en tiempo real.',
            'Busca una COHERENCIA alta para validar que el ruido rosa llega limpio al micro.'
          ],
          tips: 'La transferencia te permite ver la "huella" del sistema restando la influencia de la música o el ruido.',
          setup: 'Pink Noise + Reference Loop'
        };
      case 'impulse':
        return {
          title: 'Impulse Response (IR)',
          steps: [
            'Usa SINE SWEEP para máxima precisión y rechazo de ruido.',
            'Presiona "D" justo antes de lanzar el barrido.',
            'El barrido logarítmico (20-20k) capturará reflexiones exactas.',
            'Analiza el gráfico ETC para ver rebotes en paredes o techos.'
          ],
          tips: 'El Sine Sweep tiene una relación señal/ruido mucho mayor que el ruido rosa para medir acústica de salas.',
          setup: 'Sine Sweep -> Room -> Mic'
        };
      default:
        return {
          title: 'Security Scanner',
          steps: [
            'Establece tu "Decryption Key" compartida.',
            'Inicia el "Live Scan" durante la transmisión.',
            'Si aparece "AUTHENTICATED", la señal es original.'
          ],
          tips: 'DSSS es invisible al oído pero detectable matemáticamente mediante correlación.',
          setup: 'Digital Signal Analysis'
        };
    }
  };

  const content = getContent();

  return (
    <aside className="w-80 border-l border-white/5 bg-[#050505]/95 backdrop-blur-xl flex flex-col shrink-0 animate-fade-in z-50 overflow-y-auto custom-scrollbar shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-cyan-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Docs & Guide</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-tighter mb-4 flex items-center gap-2">
            <Play size={12} fill="currentColor" /> {content.title}
          </h3>
          <div className="space-y-4">
            {content.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-[10px] mono font-bold text-slate-700 mt-0.5">{i + 1}.</span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Waves size={14} className="text-purple-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase">Acoustic Signal Path</span>
          </div>
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                   <Waves size={12} className="text-emerald-400" />
                   <span className="text-[9px] mono text-slate-300">Pink Noise</span>
                </div>
                <span className="text-[8px] text-slate-500 uppercase">Steady State</span>
             </div>
             <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                   <Zap size={12} className="text-cyan-400" />
                   <span className="text-[9px] mono text-slate-300">Sine Sweep</span>
                </div>
                <span className="text-[8px] text-slate-500 uppercase">Acoustic IR</span>
             </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-amber-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase">Pro Tip</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed italic border-l-2 border-amber-500/20 pl-4">
            "{content.tips}"
          </p>
        </section>

        <div className="pt-8 opacity-20 hover:opacity-100 transition-opacity">
           <div className="p-4 rounded-xl border border-dashed border-white/10 text-center">
              <HelpCircle size={24} className="mx-auto mb-2 text-slate-500" />
              <p className="text-[8px] mono uppercase text-slate-500">
                <span className="gradient-pro font-black">AXIOM</span> V2.5 Professional Series<br/>Knowledge Base System
              </p>
           </div>
        </div>
      </div>
    </aside>
  );
};

export default KnowledgeBase;
