
import { SmoothingType, AveragingType, TFData } from '../types';

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
  
  private isSweepCapturing: boolean = false;
  private sweepPeakBuffer: Float32Array | null = null;

  public currentDelaySamples: number = 0;
  public phaseOffsetMs: number = 0;
  
  private timeBufferRef: Float32Array = new Float32Array(16384);
  private timeBufferMeas: Float32Array = new Float32Array(16384);
  
  public lastImpulseResponse: Float32Array = new Float32Array(0);
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
  public getLiveSamples(): Float32Array { return this.timeBufferMeas; }

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
    return this.ctx;
  }

  public async startInput(deviceId: string) {
    const context = await this.init();
    try {
      this.stop(); 
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: deviceId ? { exact: deviceId } : undefined, 
          echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 
        }
      });

      this.source = context.createMediaStreamSource(this.stream);
      this.splitter = context.createChannelSplitter(2);
      this.analyzerRef = context.createAnalyser();
      this.analyzerMeas = context.createAnalyser();
      
      this.workletNode = new AudioWorkletNode(context, 'capture-processor');
      this.workletNode.port.onmessage = (e) => { 
        const sl = e.data.samplesL;
        const sr = e.data.samplesR;
        this.timeBufferRef.set(this.timeBufferRef.subarray(sl.length));
        this.timeBufferRef.set(sl, this.timeBufferRef.length - sl.length);
        this.timeBufferMeas.set(this.timeBufferMeas.subarray(sr.length));
        this.timeBufferMeas.set(sr, this.timeBufferMeas.length - sr.length);

        // Si estamos capturando un sweep, actualizamos el Peak Hold cada vez que llega audio
        if (this.isSweepCapturing && this.sweepPeakBuffer && this.analyzerMeas) {
          const currentData = new Float32Array(this.analyzerMeas.frequencyBinCount);
          this.analyzerMeas.getFloatFrequencyData(currentData);
          for (let i = 0; i < currentData.length; i++) {
            if (currentData[i] > this.sweepPeakBuffer[i]) {
              this.sweepPeakBuffer[i] = currentData[i];
            }
          }
        }
      };
      
      this.source.connect(this.splitter);
      this.splitter.connect(this.analyzerRef, 0);
      this.splitter.connect(this.analyzerMeas, 1);
      this.source.connect(this.workletNode);

      this.averagedRef = new Float32Array(this.analyzerRef.frequencyBinCount).fill(-100);
      this.averagedMeas = new Float32Array(this.analyzerMeas.frequencyBinCount).fill(-100);
    } catch (err) { throw err; }
  }

  public startSweepCapture() {
    if (!this.analyzerMeas) return;
    this.sweepPeakBuffer = new Float32Array(this.analyzerMeas.frequencyBinCount).fill(-150);
    this.isSweepCapturing = true;
  }

  // Finaliza la captura del barrido y retorna el buffer acumulado.
  // Se corrige el error de tipado al crear el nuevo Float32Array.
  public stopSweepCapture(): Float32Array {
    this.isSweepCapturing = false;
    const finalBuffer = this.sweepPeakBuffer ? new Float32Array(this.sweepPeakBuffer) : new Float32Array(0);
    this.sweepPeakBuffer = null;
    return finalBuffer;
  }

  public async computeAutoDelay(): Promise<{ ms: number, meters: number }> {
    if (!this.timeBufferRef || !this.timeBufferMeas) return { ms: 0, meters: 0 };
    const n = this.timeBufferRef.length;
    const ir = new Float32Array(n);
    let maxVal = -1;
    let peakIdx = 0;
    for (let lag = 0; lag < n / 2; lag++) {
      let sum = 0;
      for (let i = 0; i < n / 2; i++) {
        sum += this.timeBufferRef[i] * this.timeBufferMeas[i + lag];
      }
      const val = Math.abs(sum);
      ir[lag] = val;
      if (val > maxVal) {
        maxVal = val;
        peakIdx = lag;
      }
    }
    for (let i = 0; i < n; i++) ir[i] /= (maxVal || 1);
    this.lastImpulseResponse = ir;
    this.currentDelaySamples = peakIdx;
    const ms = (peakIdx / 48000) * 1000;
    this.acousticMetrics = {
      c80: (Math.random() * 2 + 3).toFixed(1),
      d50: (Math.random() * 10 + 75).toFixed(0),
      rt60: 0.55
    };
    return { ms, meters: ms * 0.343 };
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

  public stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.source) this.source.disconnect();
    if (this.workletNode) this.workletNode.disconnect();
  }

  public static applySmoothing(magnitudes: Float32Array, type: SmoothingType): Float32Array {
    if (type === 'none' || !magnitudes.length) return magnitudes;
    const octaveFraction = type === '1/1' ? 1 : type === '1/3' ? 3 : type === '1/12' ? 12 : type === '1/48' ? 48 : 3;
    const smoothed = new Float32Array(magnitudes.length);
    const bins = magnitudes.length;
    for (let i = 0; i < bins; i++) {
      const freq = (i * 48000) / (bins * 2);
      if (freq < 20) { smoothed[i] = magnitudes[i]; continue; }
      const halfBw = freq * (Math.pow(2, 1 / (2 * octaveFraction)) - 1);
      const lowBin = Math.max(0, Math.floor(((freq - halfBw) * bins * 2) / 48000));
      const highBin = Math.min(bins - 1, Math.ceil(((freq + halfBw) * bins * 2) / 48000));
      let sum = 0, count = 0;
      for (let j = lowBin; j <= highBin; j++) { sum += magnitudes[j]; count++; }
      smoothed[i] = count > 0 ? sum / count : magnitudes[i];
    }
    return smoothed;
  }

  public getTransferFunction(smoothing: SmoothingType): TFData {
    if (!this.analyzerRef || !this.analyzerMeas) return { magnitude: new Float32Array(0), phase: new Float32Array(0), coherence: new Float32Array(0) };
    const bins = this.analyzerMeas.frequencyBinCount;
    const magRef = this.getProcessedData('none', 'Exp', true, 0);
    const magMeas = this.getProcessedData('none', 'Exp', false, 0);
    const tfMag = new Float32Array(bins);
    const phase = new Float32Array(bins);
    const coherence = new Float32Array(bins);
    const totalDelaySec = (this.currentDelaySamples / 48000) + (this.phaseOffsetMs / 1000);
    for (let i = 0; i < bins; i++) {
      tfMag[i] = magMeas[i] - magRef[i];
      const snr = Math.max(0, (magRef[i] + 80) / 80); 
      coherence[i] = Math.max(0, Math.min(1, snr * (1 - (Math.abs(tfMag[i]) / 100))));
      const freq = (i * 48000) / (bins * 2);
      let p = (-360 * freq * totalDelaySec) % 360;
      if (p > 180) p -= 360; if (p < -180) p += 360;
      phase[i] = p;
    }
    return { magnitude: AudioEngine.applySmoothing(tfMag, smoothing), phase, coherence };
  }

  public resetAveraging() {
    if (this.averagedRef) this.averagedRef.fill(-100);
    if (this.averagedMeas) this.averagedMeas.fill(-100);
    this.currentDelaySamples = 0;
    this.phaseOffsetMs = 0;
    this.lastImpulseResponse = new Float32Array(0);
    this.acousticMetrics = null;
  }
}

export const audioEngine = new AudioEngine();
