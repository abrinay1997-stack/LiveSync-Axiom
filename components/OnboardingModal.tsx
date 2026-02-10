
import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Mic,
  MonitorSpeaker,
  Cable,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Volume2,
  Zap,
  Target,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STORAGE_KEY = 'livesync-axiom-onboarding-complete';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(0);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  if (!isOpen) return null;

  const steps = [
    // Step 0: Welcome
    {
      title: 'Bienvenido a LiveSync Axiom',
      subtitle: 'Herramienta profesional de medicion acustica',
      content: (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
              <Target size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">LiveSync Axiom</h2>
            <p className="text-sm text-slate-400">Analisis FFT dual-canal para ingenieros de sonido</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Volume2 size={24} className="mx-auto text-cyan-400 mb-2" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">RTA</span>
              <p className="text-[8px] text-slate-500 mt-1">Analisis en tiempo real</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Zap size={24} className="mx-auto text-purple-400 mb-2" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">Transfer</span>
              <p className="text-[8px] text-slate-500 mt-1">Funcion de transferencia</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Target size={24} className="mx-auto text-emerald-400 mb-2" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">Delay</span>
              <p className="text-[8px] text-slate-500 mt-1">Alineacion de sistemas</p>
            </div>
          </div>
        </div>
      ),
    },
    // Step 1: What you need - Microphone
    {
      title: 'Que necesitas: Microfono',
      subtitle: 'Equipamiento requerido',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-400">Microfono de medicion</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Un microfono con respuesta plana y omnidireccional es esencial para mediciones precisas.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Opciones recomendadas:</h4>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white">Behringer ECM8000</span>
                  <span className="ml-2 text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Economico</span>
                </div>
                <span className="text-[10px] text-slate-500">~$50 USD</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Omnidireccional, respuesta plana 15Hz-20kHz. Ideal para comenzar.</p>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white">Dayton Audio EMM-6</span>
                  <span className="ml-2 text-[9px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Calibrado</span>
                </div>
                <span className="text-[10px] text-slate-500">~$80 USD</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Incluye archivo de calibracion individual. Muy preciso.</p>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white">Earthworks M30</span>
                  <span className="ml-2 text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Profesional</span>
                </div>
                <span className="text-[10px] text-slate-500">~$650 USD</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Estandar de la industria. Respuesta ultra-plana 9Hz-30kHz.</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200">
                <strong>NO uses</strong> microfonos vocales (SM58, etc.) - su respuesta no es plana y distorsionara las mediciones.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    // Step 2: What you need - Audio Interface
    {
      title: 'Que necesitas: Interfaz de Audio',
      subtitle: 'Equipamiento requerido',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-400">Interfaz con 2 entradas</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Para medir Transfer Function y Delay necesitas <strong>2 canales de entrada</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-4 border border-white/10">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Conexion requerida:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <div className="w-8 h-8 bg-cyan-500/20 rounded flex items-center justify-center">
                  <span className="text-[10px] font-black text-cyan-400">IN1</span>
                </div>
                <ArrowRight size={14} className="text-slate-500" />
                <div>
                  <span className="text-[10px] font-bold text-cyan-400">REFERENCIA</span>
                  <p className="text-[9px] text-slate-400">Senal de consola (matrix out, aux)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <div className="w-8 h-8 bg-rose-500/20 rounded flex items-center justify-center">
                  <span className="text-[10px] font-black text-rose-400">IN2</span>
                </div>
                <ArrowRight size={14} className="text-slate-500" />
                <div>
                  <span className="text-[10px] font-bold text-rose-400">MEDICION</span>
                  <p className="text-[9px] text-slate-400">Microfono de medicion</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Interfaces recomendadas:</h4>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <span className="text-[11px] font-bold text-white">Focusrite Scarlett 2i2</span>
              <span className="ml-2 text-[9px] text-emerald-400">~$180 USD</span>
              <p className="text-[10px] text-slate-400 mt-1">2 entradas XLR/TRS, compatible con Web Audio</p>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <span className="text-[11px] font-bold text-white">MOTU M2</span>
              <span className="ml-2 text-[9px] text-cyan-400">~$200 USD</span>
              <p className="text-[10px] text-slate-400 mt-1">Excelentes preamps, baja latencia</p>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <span className="text-[11px] font-bold text-white">PreSonus AudioBox USB 96</span>
              <span className="ml-2 text-[9px] text-purple-400">~$100 USD</span>
              <p className="text-[10px] text-slate-400 mt-1">Opcion economica, 2 entradas combo</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200">
                <strong>Importante:</strong> El RTA funciona con 1 entrada, pero Transfer Function y Delay Finder requieren 2 entradas.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    // Step 3: Connection diagram
    {
      title: 'Diagrama de Conexion',
      subtitle: 'Como conectar todo',
      content: (
        <div className="space-y-4">
          <div className="bg-black/60 rounded-xl p-6 border border-white/10">
            <div className="flex flex-col items-center gap-4">
              {/* Console */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
                    <MonitorSpeaker size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white">CONSOLA</span>
                    <p className="text-[8px] text-slate-500">Matrix/Aux Out</p>
                  </div>
                </div>
                <div className="flex-1 mx-4 border-t-2 border-dashed border-cyan-500/50 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400 bg-black px-2">XLR/TRS</span>
                </div>
                <div className="w-8 h-8 bg-cyan-500/20 rounded border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-[9px] font-black text-cyan-400">1</span>
                </div>
              </div>

              {/* PA System */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
                    <Volume2 size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white">PA / SPEAKER</span>
                    <p className="text-[8px] text-slate-500">Reproduciendo audio</p>
                  </div>
                </div>
                <div className="flex-1 mx-4 flex items-center justify-center">
                  <span className="text-[10px] text-amber-400 animate-pulse">~ sonido ~</span>
                </div>
                <div className="w-16 h-12 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
                  <Mic size={20} className="text-slate-400" />
                </div>
              </div>

              {/* Mic */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
                    <Mic size={20} className="text-rose-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white">MIC MEDICION</span>
                    <p className="text-[8px] text-slate-500">Posicion FOH</p>
                  </div>
                </div>
                <div className="flex-1 mx-4 border-t-2 border-dashed border-rose-500/50 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-rose-400 bg-black px-2">XLR</span>
                </div>
                <div className="w-8 h-8 bg-rose-500/20 rounded border border-rose-500/30 flex items-center justify-center">
                  <span className="text-[9px] font-black text-rose-400">2</span>
                </div>
              </div>

              {/* Interface */}
              <div className="w-full flex justify-end">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded border border-cyan-500/30 flex items-center justify-center">
                      <span className="text-[9px] font-black text-cyan-400">1</span>
                    </div>
                    <div className="w-8 h-8 bg-rose-500/20 rounded border border-rose-500/30 flex items-center justify-center">
                      <span className="text-[9px] font-black text-rose-400">2</span>
                    </div>
                  </div>
                  <div className="w-20 h-12 bg-purple-900/50 rounded-lg border border-purple-500/30 flex items-center justify-center">
                    <Cable size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white">INTERFAZ</span>
                    <p className="text-[8px] text-slate-500">USB a computador</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
              <span className="text-[9px] font-bold text-cyan-400 uppercase">Canal 1 (L)</span>
              <p className="text-[10px] text-slate-300 mt-1">Senal de referencia directa de la consola</p>
            </div>
            <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
              <span className="text-[9px] font-bold text-rose-400 uppercase">Canal 2 (R)</span>
              <p className="text-[10px] text-slate-300 mt-1">Microfono capturando el sonido del PA</p>
            </div>
          </div>
        </div>
      ),
    },
    // Step 4: Ready to start
    {
      title: 'Listo para empezar!',
      subtitle: 'Tu checklist antes de medir',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <span className="text-[11px] text-slate-300">Microfono de medicion conectado a Input 2</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <span className="text-[11px] text-slate-300">Senal de consola en Input 1 (para TF/Delay)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <span className="text-[11px] text-slate-300">Interfaz seleccionada en la aplicacion</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <span className="text-[11px] text-slate-300">Pink noise o musica reproduciendose</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-white/10">
            <h4 className="text-[11px] font-bold text-white mb-2">Siguiente paso:</h4>
            <ol className="space-y-2 text-[10px] text-slate-300">
              <li>1. Click en el icono de engranaje para abrir Settings</li>
              <li>2. Selecciona tu interfaz de audio</li>
              <li>3. Verifica que los medidores L/R muestren senal</li>
              <li>4. Click en "RUN ENGINE" para comenzar</li>
            </ol>
          </div>

          <div className="text-center pt-4">
            <p className="text-[10px] text-slate-500">
              Puedes volver a ver esta guia desde el menu de ayuda
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40">
          <div>
            <h2 className="text-sm font-black text-white">{currentStep.title}</h2>
            <p className="text-[10px] text-slate-500">{currentStep.subtitle}</p>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-black/20 border-b border-white/5">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= step ? 'bg-cyan-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-2 text-center">
            Paso {step + 1} de {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {currentStep.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/40">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-500 rounded-lg text-[10px] font-black text-black hover:bg-cyan-400 transition-colors"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-[10px] font-black text-white hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
            >
              Comenzar a medir
              <Zap size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;

// Hook to check if onboarding should show
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowOnboarding(true);
  };

  return { showOnboarding, setShowOnboarding, resetOnboarding };
}
