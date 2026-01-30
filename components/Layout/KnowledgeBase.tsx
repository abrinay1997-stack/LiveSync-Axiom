
import React from 'react';
import { X, BookOpen, HelpCircle, ArrowRight, Mic, Cable, Play, Info } from 'lucide-react';

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
            'Conecta tu micrófono de medición al Canal 2.',
            'Presiona "RUN ENGINE" para iniciar la captura.',
            'Ajusta el "Visual Gain" si la señal es muy baja.',
            'Usa "Smoothing" (1/3 o 1/6) para ver el balance tonal general.'
          ],
          tips: 'El RTA mide energía. Es ideal para ver el balance tonal, pero no te dirá nada sobre el tiempo o la fase.',
          setup: 'Mic -> Input 2'
        };
      case 'tf':
        return {
          title: 'Transfer Function (TF)',
          steps: [
            'Loopback: Conecta la salida de tu consola al Canal 1 (Referencia).',
            'Medición: Conecta tu micrófono al Canal 2.',
            'Presiona "FIND DELAY" para sincronizar ambos canales.',
            'Observa la COHERENCIA: Si las barras son bajas, no confíes en la curva.'
          ],
          tips: 'La fase (violeta) es clave para alinear subs con tops. Busca que las líneas coincidan en el crossover.',
          setup: 'Consola (L) -> Ch1 | Mic -> Ch2'
        };
      case 'impulse':
        return {
          title: 'Impulse Response (IR)',
          steps: [
            'Genera Ruido Rosa desde el "Signal Gen".',
            'Presiona "D" para capturar la respuesta al impulso.',
            'Observa el "Direct Arrival" para calcular distancias reales.',
            'Analiza C80 para música y D50 para claridad de voz.'
          ],
          tips: 'La curva ETC (Cyan) te ayuda a identificar reflexiones dañinas de paredes o techos.',
          setup: 'Pink Noise -> Speaker -> Mic'
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
            <Cable size={14} className="text-purple-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase">Hardware Setup</span>
          </div>
          <div className="flex items-center justify-center gap-4 py-2">
             <div className="flex flex-col items-center gap-1 opacity-60">
                <Mic size={16} />
                <span className="text-[8px] mono">INPUT</span>
             </div>
             <ArrowRight size={12} className="text-slate-700" />
             <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded text-[10px] font-bold text-cyan-400 mono">
                {content.setup}
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
              <p className="text-[8px] mono uppercase text-slate-500">Axiom V2.5 Professional Series<br/>Knowledge Base System</p>
           </div>
        </div>
      </div>
    </aside>
  );
};

export default KnowledgeBase;
