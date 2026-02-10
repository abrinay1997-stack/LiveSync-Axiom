
import React, { useState } from 'react';
import {
  X, BookOpen, HelpCircle, ArrowRight, Mic, Cable, Play, Info, Waves, Zap,
  ChevronDown, ChevronRight, Target, AlertTriangle, CheckCircle, Keyboard, Wrench
} from 'lucide-react';

interface KnowledgeBaseProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ activeTab, isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('steps');

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getContent = () => {
    switch (activeTab) {
      case 'rta':
        return {
          title: 'Real Time Analyzer (RTA)',
          steps: [
            'Reproduce PINK NOISE desde la consola hacia el PA.',
            'Conecta tu microfono de medicion al Canal 2 (R).',
            'Presiona "RUN ENGINE" para iniciar la captura.',
            'Ajusta "Visual Gain" hasta ver la curva centrada.'
          ],
          workflows: [
            {
              name: 'EQ Rapido del Sistema',
              steps: ['Pink noise a nivel moderado', 'Captura traza (Space)', 'Aplica EQ correctivo', 'Compara A/B']
            },
            {
              name: 'Check de Subwoofers',
              steps: ['Mide cerca del sub', 'Verifica extension LF', 'Busca picos de room modes', 'Ajusta crossover']
            }
          ],
          troubleshooting: [
            { problem: 'Traza muy baja', solution: 'Aumenta Visual Gain o sube nivel de pink noise' },
            { problem: 'Ruido en HF', solution: 'Reduce ganancia de preamp o aleja de fuentes RF' },
            { problem: 'Traza inestable', solution: 'Aumenta FFT Size (16K o 32K) para mas resolucion' }
          ],
          tips: 'El RTA es ideal para ajustes tonales rapidos. Usa promediado (Avg) para estabilizar la traza.',
          setup: 'Pink Noise -> Speaker -> Mic'
        };
      case 'tf':
        return {
          title: 'Transfer Function (TF)',
          steps: [
            'Canal 1 (L): Senal de referencia desde consola (Matrix/Aux).',
            'Canal 2 (R): Microfono de medicion.',
            'Reproduce PINK NOISE o musica con contenido completo.',
            'Busca COHERENCIA > 0.8 para mediciones validas.'
          ],
          workflows: [
            {
              name: 'Alineacion Main + Delay',
              steps: ['Mide Main solo primero', 'Captura como referencia', 'Activa Delay tower', 'Usa Delay Finder para alinear']
            },
            {
              name: 'EQ de Sistema Completo',
              steps: ['TF con coherencia alta', 'Identifica peaks/dips', 'Abre Correction Panel', 'Aplica sugerencias EQ']
            }
          ],
          troubleshooting: [
            { problem: 'Coherencia baja', solution: 'Sube nivel de pink noise o reduce ruido ambiente' },
            { problem: 'Fase erratica', solution: 'Verifica polaridad del microfono y conexiones' },
            { problem: 'Sin senal en Ref', solution: 'Revisa ruteo de Matrix/Aux a Input 1' }
          ],
          tips: 'La TF te permite ver la respuesta del sistema independiente del contenido de audio.',
          setup: 'Console Out + Measurement Mic'
        };
      case 'impulse':
        return {
          title: 'Impulse Response (IR)',
          steps: [
            'Usa SINE SWEEP (20Hz-20kHz) para maxima precision.',
            'Presiona "D" antes de reproducir el sweep.',
            'Mantente quieto durante la captura (~5-10 seg).',
            'Analiza ETC para ver reflexiones y RT60.'
          ],
          workflows: [
            {
              name: 'Medir Delay entre Stacks',
              steps: ['Posiciona mic en zona de overlap', 'Captura IR del Main', 'Captura IR del Delay', 'Lee diferencia de tiempo']
            },
            {
              name: 'Analisis Acustico de Sala',
              steps: ['Sweep en centro de venue', 'Observa primeras reflexiones', 'Mide RT60', 'Identifica flutter echoes']
            }
          ],
          troubleshooting: [
            { problem: 'IR muy ruidosa', solution: 'Usa sweep mas largo o aumenta nivel' },
            { problem: 'No detecta delay', solution: 'Verifica que ambos canales reciben senal' },
            { problem: 'Picos multiples', solution: 'Normal - son reflexiones de la sala' }
          ],
          tips: 'El Sine Sweep tiene SNR superior al pink noise para mediciones acusticas precisas.',
          setup: 'Sine Sweep -> Room -> Mic'
        };
      default:
        return {
          title: 'General',
          steps: ['Selecciona una pestaña (RTA, TF, Impulse) para ver la guia especifica.'],
          workflows: [],
          troubleshooting: [],
          tips: 'Usa los atajos de teclado para navegar rapidamente.',
          setup: ''
        };
    }
  };

  const content = getContent();

  const shortcuts = [
    { key: 'Space', action: 'Capturar traza' },
    { key: '1/2/3', action: 'Cambiar tab' },
    { key: 'D', action: 'Auto Delay' },
    { key: 'R', action: 'Reset analisis' },
    { key: 'B', action: 'Toggle sidebar' },
    { key: 'H', action: 'Toggle ayuda' },
    { key: ',', action: 'Abrir config' },
  ];

  return (
    <aside className="w-80 border-l border-white/5 bg-[#050505]/95 backdrop-blur-xl flex flex-col shrink-0 animate-fade-in z-50 overflow-y-auto custom-scrollbar shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-cyan-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Guia Practica</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-2 px-2">
          <Target size={16} className="text-cyan-400" />
          <h3 className="text-sm font-black text-white">{content.title}</h3>
        </div>

        {/* Quick Start Steps */}
        <button
          onClick={() => toggleSection('steps')}
          className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Play size={12} className="text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">Inicio Rapido</span>
          </div>
          {expandedSection === 'steps' ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        </button>
        {expandedSection === 'steps' && (
          <div className="space-y-2 px-2">
            {content.steps.map((step, i) => (
              <div key={i} className="flex gap-3 p-2 bg-black/30 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400 shrink-0">{i + 1}</span>
                <p className="text-[10px] text-slate-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        )}

        {/* Workflows */}
        {'workflows' in content && content.workflows && content.workflows.length > 0 && (
          <>
            <button
              onClick={() => toggleSection('workflows')}
              className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-purple-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase">Flujos de Trabajo</span>
              </div>
              {expandedSection === 'workflows' ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </button>
            {expandedSection === 'workflows' && (
              <div className="space-y-3 px-2">
                {content.workflows.map((wf, i) => (
                  <div key={i} className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
                    <h4 className="text-[10px] font-bold text-purple-400 mb-2">{wf.name}</h4>
                    <div className="space-y-1">
                      {wf.steps.map((s, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <ArrowRight size={8} className="text-slate-600" />
                          <span className="text-[9px] text-slate-400">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Troubleshooting */}
        {'troubleshooting' in content && content.troubleshooting && content.troubleshooting.length > 0 && (
          <>
            <button
              onClick={() => toggleSection('troubleshooting')}
              className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wrench size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase">Solucion de Problemas</span>
              </div>
              {expandedSection === 'troubleshooting' ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </button>
            {expandedSection === 'troubleshooting' && (
              <div className="space-y-2 px-2">
                {content.troubleshooting.map((item, i) => (
                  <div key={i} className="bg-black/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={10} className="text-amber-400" />
                      <span className="text-[9px] font-bold text-amber-300">{item.problem}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <CheckCircle size={10} className="text-emerald-400" />
                      <span className="text-[9px] text-emerald-300">{item.solution}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Keyboard Shortcuts */}
        <button
          onClick={() => toggleSection('shortcuts')}
          className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-slate-500/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Keyboard size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">Atajos de Teclado</span>
          </div>
          {expandedSection === 'shortcuts' ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        </button>
        {expandedSection === 'shortcuts' && (
          <div className="grid grid-cols-2 gap-2 px-2">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-black/30 rounded-lg">
                <kbd className="px-2 py-0.5 bg-slate-800 rounded text-[8px] font-mono text-slate-300 border border-slate-700">{s.key}</kbd>
                <span className="text-[8px] text-slate-500">{s.action}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pro Tip */}
        <div className="p-3 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Info size={12} className="text-cyan-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase">Pro Tip</span>
          </div>
          <p className="text-[9px] text-slate-400 leading-relaxed italic">
            {content.tips}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-4 opacity-30 hover:opacity-60 transition-opacity">
          <div className="p-3 rounded-xl border border-dashed border-white/10 text-center">
            <p className="text-[7px] mono uppercase text-slate-600">
              <span className="gradient-pro font-black">AXIOM</span> Knowledge Base
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default KnowledgeBase;
