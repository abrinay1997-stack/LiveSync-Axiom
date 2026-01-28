
import { SmoothingType, AveragingType, TFData } from '../types';

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private analyzerRef: AnalyserNode | null = null;
  private analyzerMeas: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  
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
      navigator.mediaDevices.addEventListener('devicechange', () => {
        if (this.onDeviceChangeCallback) this.onDeviceChangeCallback();
      });
    }
  }

  public setOnDeviceChange(callback: () => void) { this.onDeviceChangeCallback = callback; }
  public getAnalyzer(): AnalyserNode | null { return this.analyzerMeas; }
  public getRefAnalyzer(): AnalyserNode | null { return this.analyzerRef; }
  public getLiveSamples(): Float32Array { return this.captureBufferR; }

  public async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      const workletBlob = new Blob([`
        class CaptureProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (input && input[0]) {
              const samplesL = new Float32Array(input[0]);
              const samplesR = input[1] ? new Float32Array(input[1]) : samplesL;
              this.port.postMessage({ samplesL, samplesR }, [samplesL.buffer, samplesR.buffer]); 
            }
            return true;
          }
        }
        registerProcessor('capture-processor', CaptureProcessor);
      `], { type: 'application/javascript' });
      await this.ctx.audioWorklet.addModule(URL.createObjectURL(workletBlob));
    }
    return this.ctx;
  }

  public async startInput(deviceId: string) {
    const context = await this.init();
    try {
      if (this.source) this.stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: deviceId ? { exact: deviceId } : undefined, 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false, 
          channelCount: 2 
        }
      });
      this.source = context.createMediaStreamSource(stream);
      this.splitter = context.createChannelSplitter(2);
      this.analyzerRef = context.createAnalyser();
      this.analyzerMeas = context.createAnalyser();
      [this.analyzerRef, this.analyzerMeas].forEach(a => { a.fftSize = 4096; a.smoothingTimeConstant = 0; });
      this.source.connect(this.splitter);
      this.splitter.connect(this.analyzerRef, 0);
      this.splitter.connect(this.analyzerMeas, 1);
      this.workletNode = new AudioWorkletNode(context, 'capture-processor');
      this.workletNode.port.onmessage = (e) => { this.captureBufferL = e.data.samplesL; this.captureBufferR = e.data.samplesR; };
      this.source.connect(this.workletNode);
      this.averagedRef = new Float32Array(this.analyzerRef.frequencyBinCount).fill(-100);
      this.averagedMeas = new Float32Array(this.analyzerMeas.frequencyBinCount).fill(-100);
    } catch (err) { throw err; }
  }

  public stop() {
    if (this.source) {
      const stream = (this.source as any).mediaStream as MediaStream;
      if (stream) stream.getTracks().forEach(t => t.stop());
      this.source.disconnect();
      this.source = null;
    }
  }

  public static applySmoothing(magnitudes: Float32Array, type: SmoothingType): Float32Array {
    if (type === 'none') return magnitudes;
    const windowMap: Record<string, number> = { '1/1': 24, '1/3': 12, '1/6': 6, '1/12': 3, '1/24': 2, '1/48': 1 };
    const winSize = windowMap[type] || 1;
    const smoothed = new Float32Array(magnitudes.length);
    for (let i = 0; i < magnitudes.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - winSize); j <= Math.min(magnitudes.length - 1, i + winSize); j++) {
        sum += magnitudes[j]; count++;
      }
      smoothed[i] = sum / count;
    }
    return smoothed;
  }

  public getProcessedData(smoothing: SmoothingType, averaging: AveragingType, isRef: boolean = false, visualGain: number = 0): Float32Array {
    const analyzer = isRef ? this.analyzerRef : this.analyzerMeas;
    const averaged = isRef ? this.averagedRef : this.averagedMeas;
    if (!analyzer || !averaged) return new Float32Array(0);
    
    const newData = new Float32Array(analyzer.frequencyBinCount);
    analyzer.getFloatFrequencyData(newData);
    
    // Aplicamos Ganancia Visual si es necesario
    if (visualGain !== 0) {
      for (let i = 0; i < newData.length; i++) {
        newData[i] += visualGain;
      }
    }

    if (averaging === 'Exp') {
      const alpha = 0.15; 
      for (let i = 0; i < newData.length; i++) averaged[i] = alpha * newData[i] + (1 - alpha) * averaged[i];
    } else { averaged.set(newData); }
    
    return AudioEngine.applySmoothing(averaged, smoothing);
  }

  public getTransferFunction(smoothing: SmoothingType): TFData {
    if (!this.analyzerRef || !this.analyzerMeas) return { magnitude: new Float32Array(0), phase: new Float32Array(0), coherence: new Float32Array(0) };
    const bins = this.analyzerMeas.frequencyBinCount;
    // La TF no debe llevar ganancia visual para no falsear la relación real entre canales
    const magRef = this.getProcessedData(smoothing, 'Exp', true, 0);
    const magMeas = this.getProcessedData(smoothing, 'Exp', false, 0);
    
    const tfMag = new Float32Array(bins);
    const phase = new Float32Array(bins);
    const coherence = new Float32Array(bins);
    
    const totalDelaySec = (this.currentDelaySamples / 48000) + (this.phaseOffsetMs / 1000);

    for (let i = 0; i < bins; i++) {
      tfMag[i] = magMeas[i] - magRef[i];
      const diff = Math.abs(tfMag[i]);
      coherence[i] = Math.max(0, Math.min(1, 1 - (diff / 60))); 

      const freq = (i * 48000) / (bins * 2);
      let p = (-360 * freq * totalDelaySec) % 360;
      if (p > 180) p -= 360; if (p < -180) p += 360;
      phase[i] = p;
    }
    
    return { magnitude: tfMag, phase, coherence };
  }

  public async computeAutoDelay(): Promise<{ ms: number, meters: number }> {
    return { ms: 0, meters: 0 };
  }

  public resetAveraging() {
    [this.averagedRef, this.averagedMeas].forEach(a => a?.fill(-100));
    this.currentDelaySamples = 0;
    this.phaseOffsetMs = 0;
  }
}
export const audioEngine = new AudioEngine();
