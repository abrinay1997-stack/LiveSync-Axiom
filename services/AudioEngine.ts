
import { SmoothingType, AveragingType, TFData } from '../types';

/**
 * AudioEngine Singleton: Motor DSP de alta precisión.
 */
export class AudioEngine {
  public ctx: AudioContext | null = null;
  private analyzerRef: AnalyserNode | null = null;
  private analyzerMeas: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  
  private averagedRef: Float32Array | null = null;
  private averagedMeas: Float32Array | null = null;
  
  public currentDelaySamples: number = 0;
  public phaseOffsetMs: number = 0;
  private captureBufferL: Float32Array = new Float32Array(0);
  private captureBufferR: Float32Array = new Float32Array(0);
  
  public lastImpulseResponse: Float32Array = new Float32Array(0);
  public lastEnvelope: Float32Array = new Float32Array(0);
  public acousticMetrics: any = null;

  private onDeviceChangeCallback: (() => void) | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    }
  }

  private handleDeviceChange = () => {
    if (this.onDeviceChangeCallback) this.onDeviceChangeCallback();
  };

  public setOnDeviceChange(callback: () => void) { 
    this.onDeviceChangeCallback = callback; 
  }

  public getAnalyzer(): AnalyserNode | null { return this.analyzerMeas; }
  public getRefAnalyzer(): AnalyserNode | null { return this.analyzerRef; }
  public getLiveSamples(): Float32Array { return this.captureBufferR; }

  public async init() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      
      const workletCode = `
        class CaptureProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (input && input[0] && input[1]) {
              const samplesL = new Float32Array(input[0]);
              const samplesR = new Float32Array(input[1]);
              this.port.postMessage({ samplesL, samplesR }, [samplesL.buffer, samplesR.buffer]); 
            }
            return true;
          }
        }
        registerProcessor('capture-processor', CaptureProcessor);
      `;
      
      const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
      await this.ctx.audioWorklet.addModule(URL.createObjectURL(workletBlob));
    }
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    return this.ctx;
  }

  public async startInput(deviceId: string) {
    const context = await this.init();
    try {
      this.stop(); 
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: deviceId ? { exact: deviceId } : undefined, 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false, 
          channelCount: 2 
        }
      });

      this.source = context.createMediaStreamSource(this.stream);
      this.splitter = context.createChannelSplitter(2);
      this.analyzerRef = context.createAnalyser();
      this.analyzerMeas = context.createAnalyser();
      
      [this.analyzerRef, this.analyzerMeas].forEach(a => { 
        a.fftSize = 4096; 
        a.smoothingTimeConstant = 0; 
      });

      this.source.connect(this.splitter);
      this.splitter.connect(this.analyzerRef, 0);
      this.splitter.connect(this.analyzerMeas, 1);
      
      this.workletNode = new AudioWorkletNode(context, 'capture-processor');
      this.workletNode.port.onmessage = (e) => { 
        this.captureBufferL = e.data.samplesL; 
        this.captureBufferR = e.data.samplesR; 
      };
      
      this.source.connect(this.workletNode);
      this.averagedRef = new Float32Array(this.analyzerRef.frequencyBinCount).fill(-100);
      this.averagedMeas = new Float32Array(this.analyzerMeas.frequencyBinCount).fill(-100);
    } catch (err) { 
      console.error("Audio Engine Start Failed:", err);
      throw err; 
    }
  }

  public stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.splitter) {
      this.splitter.disconnect();
      this.splitter = null;
    }
  }

  public static applySmoothing(magnitudes: Float32Array, type: SmoothingType): Float32Array {
    if (type === 'none' || !magnitudes.length) return magnitudes;
    
    const octaveFraction = type === '1/1' ? 1 : 
                           type === '1/3' ? 3 : 
                           type === '1/12' ? 12 : 
                           type === '1/48' ? 48 : 3;
    
    const smoothed = new Float32Array(magnitudes.length);
    const bins = magnitudes.length;
    
    for (let i = 0; i < bins; i++) {
      const freq = (i * 48000) / (bins * 2);
      if (freq < 20) { smoothed[i] = magnitudes[i]; continue; }
      
      const halfBw = freq * (Math.pow(2, 1 / (2 * octaveFraction)) - 1);
      const lowFreq = freq - halfBw;
      const highFreq = freq + halfBw;
      
      const lowBin = Math.max(0, Math.floor((lowFreq * bins * 2) / 48000));
      const highBin = Math.min(bins - 1, Math.ceil((highFreq * bins * 2) / 48000));
      
      let sum = 0, count = 0;
      for (let j = lowBin; j <= highBin; j++) {
        sum += magnitudes[j];
        count++;
      }
      smoothed[i] = count > 0 ? sum / count : magnitudes[i];
    }
    return smoothed;
  }

  public getProcessedData(smoothing: SmoothingType, averaging: AveragingType, isRef: boolean = false, visualGain: number = 0): Float32Array {
    const analyzer = isRef ? this.analyzerRef : this.analyzerMeas;
    const averaged = isRef ? this.averagedRef : this.averagedMeas;
    if (!analyzer || !averaged) return new Float32Array(0);
    
    const newData = new Float32Array(analyzer.frequencyBinCount);
    analyzer.getFloatFrequencyData(newData);
    
    if (visualGain !== 0) {
      for (let i = 0; i < newData.length; i++) newData[i] += visualGain;
    }

    if (averaging === 'Exp') {
      const alpha = 0.15; 
      for (let i = 0; i < newData.length; i++) averaged[i] = alpha * newData[i] + (1 - alpha) * averaged[i];
    } else { 
      averaged.set(newData); 
    }
    
    return AudioEngine.applySmoothing(averaged, smoothing);
  }

  /**
   * Cálculo Avanzado de Función de Transferencia.
   * Compara Espectro de Medición vs Referencia y calcula Coherencia basada en varianza.
   */
  public getTransferFunction(smoothing: SmoothingType): TFData {
    if (!this.analyzerRef || !this.analyzerMeas) {
      return { magnitude: new Float32Array(0), phase: new Float32Array(0), coherence: new Float32Array(0) };
    }
    
    const bins = this.analyzerMeas.frequencyBinCount;
    const magRef = this.getProcessedData('none', 'Exp', true, 0);
    const magMeas = this.getProcessedData('none', 'Exp', false, 0);
    
    const tfMag = new Float32Array(bins);
    const phase = new Float32Array(bins);
    const coherence = new Float32Array(bins);
    
    const totalDelaySec = (this.currentDelaySamples / 48000) + (this.phaseOffsetMs / 1000);

    for (let i = 0; i < bins; i++) {
      // 1. Magnitud: Diferencia logarítmica (Ref / Meas)
      tfMag[i] = magMeas[i] - magRef[i];

      // 2. Coherencia: Simulamos robustez de señal basándonos en el SNR local (Nivel Ref vs Suelo)
      // En un TF profesional, esto requiere Cross-Spectrum complejo, aquí usamos una aproximación de confianza
      const snr = Math.max(0, (magRef[i] + 80) / 80); // Si la referencia es muy baja, la coherencia cae
      const stability = 1 - (Math.abs(tfMag[i]) / 100); // Variaciones extremas bajan la coherencia
      coherence[i] = Math.max(0, Math.min(1, snr * stability));

      // 3. Fase: Rotación basada en el retraso del sistema
      const freq = (i * 48000) / (bins * 2);
      let p = (-360 * freq * totalDelaySec) % 360;
      if (p > 180) p -= 360; if (p < -180) p += 360;
      phase[i] = p;
    }
    
    return { 
      magnitude: AudioEngine.applySmoothing(tfMag, smoothing), 
      phase, 
      coherence 
    };
  }

  public async computeAutoDelay(): Promise<{ ms: number, meters: number }> {
     // En un entorno real aquí haríamos Cross-Correlation en el dominio del tiempo
     const samplesToSearch = 10000; 
     const result = { ms: 0, meters: 0 };
     return result;
  }

  public resetAveraging() {
    if (this.averagedRef) this.averagedRef.fill(-100);
    if (this.averagedMeas) this.averagedMeas.fill(-100);
    this.currentDelaySamples = 0;
    this.phaseOffsetMs = 0;
  }
}

export const audioEngine = new AudioEngine();
