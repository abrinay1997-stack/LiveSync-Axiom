
import { SmoothingType, AveragingType, TFData } from '../types';

/**
 * Worker Code for high-performance DSP
 * Handles Cross-correlation, Schroeder Integration and Watermark Extraction
 */
const dspWorkerCode = `
  self.onmessage = function(e) {
    const { task, data } = e.data;
    
    if (task === 'computeDelay') {
      const { ref, meas, sampleRate } = data;
      const searchWindow = Math.min(ref.length, 16384); 
      const correlation = new Float32Array(searchWindow);
      let maxCorr = -Infinity;
      let bestLag = 0;

      for (let lag = 0; lag < searchWindow; lag++) {
        let sum = 0;
        for (let i = 0; i < ref.length - lag; i++) { sum += ref[i] * meas[i + lag]; }
        correlation[lag] = sum;
        if (sum > maxCorr) { maxCorr = sum; bestLag = lag; }
      }

      const normFactor = maxCorr > 0 ? 1 / maxCorr : 1;
      const impulse = correlation.map(v => Math.abs(v * normFactor));
      
      // Calculate RT60
      const energy = impulse.map(v => v * v);
      const schroeder = new Float32Array(energy.length);
      let totalEnergy = 0;
      for (let i = energy.length - 1; i >= 0; i--) {
        totalEnergy += energy[i];
        schroeder[i] = totalEnergy;
      }
      const schroederDB = schroeder.map(v => 10 * Math.log10(Math.max(1e-10, v / totalEnergy)));
      
      const findDrop = (targetDB) => {
        for(let i=0; i<schroederDB.length; i++) if(schroederDB[i] <= targetDB) return i;
        return schroederDB.length;
      };

      const p5 = findDrop(-5);
      const p25 = findDrop(-25);
      const p35 = findDrop(-35);

      self.postMessage({ 
        task: 'delayResult', 
        result: { 
          lag: bestLag, 
          impulse, 
          rt60: { 
            t20: ((p25 - p5) * 3) / sampleRate, 
            t30: ((p35 - p5) * 2) / sampleRate 
          } 
        } 
      });
    }
  };
`;

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private analyzerRef: AnalyserNode | null = null;
  private analyzerMeas: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private dspWorker: Worker | null = null;
  
  private averagedRef: Float32Array | null = null;
  private averagedMeas: Float32Array | null = null;
  
  public currentDelaySamples: number = 0;
  private captureBufferL: Float32Array = new Float32Array(0);
  private captureBufferR: Float32Array = new Float32Array(0);
  public lastImpulseResponse: Float32Array = new Float32Array(0);
  public rt60: { t20: number; t30: number } | null = null;
  
  // EQ Correction State
  private targetEq: Float32Array | null = null;

  public getAnalyzer(): AnalyserNode | null { return this.analyzerMeas; }
  public getRefAnalyzer(): AnalyserNode | null { return this.analyzerRef; }
  public getLiveSamples(): Float32Array { return this.captureBufferR; }

  public async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      
      // Setup Worklet
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

      // Setup DSP Worker
      const workerBlob = new Blob([dspWorkerCode], { type: 'application/javascript' });
      this.dspWorker = new Worker(URL.createObjectURL(workerBlob));
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    return this.ctx;
  }

  public async startInput(deviceId: string) {
    const context = await this.init();
    try {
      if (this.source) this.stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 }
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
      this.workletNode.port.onmessage = (e) => {
        this.captureBufferL = e.data.samplesL;
        this.captureBufferR = e.data.samplesR;
      };
      this.source.connect(this.workletNode);
      
      this.averagedRef = new Float32Array(this.analyzerRef.frequencyBinCount).fill(-100);
      this.averagedMeas = new Float32Array(this.analyzerMeas.frequencyBinCount).fill(-100);
    } catch (err) {
      console.error("Audio Start Failure:", err);
      throw err;
    }
  }

  public async computeAutoDelay(): Promise<{ ms: number, meters: number }> {
    return new Promise((resolve) => {
      if (!this.dspWorker || this.captureBufferL.length === 0) {
        resolve({ ms: 0, meters: 0 });
        return;
      }

      this.dspWorker.onmessage = (e) => {
        if (e.data.task === 'delayResult') {
          const { lag, impulse, rt60 } = e.data.result;
          this.currentDelaySamples = lag;
          this.lastImpulseResponse = impulse;
          this.rt60 = rt60;
          const ms = (lag / 48000) * 1000;
          resolve({ ms, meters: ms * 0.343 });
        }
      };

      this.dspWorker.postMessage({
        task: 'computeDelay',
        data: {
          ref: this.captureBufferL,
          meas: this.captureBufferR,
          sampleRate: 48000
        }
      }, [this.captureBufferL.buffer, this.captureBufferR.buffer]);
      
      // Restore buffers (Worker consumes them)
      this.captureBufferL = new Float32Array(0);
      this.captureBufferR = new Float32Array(0);
    });
  }

  public generateInverseEQ() {
    if (!this.averagedMeas || !this.averagedRef) return;
    const bins = this.averagedMeas.length;
    const eq = new Float32Array(bins);
    
    // Smooth the measurement for EQ calculation (1/3 octave target)
    const smoothedMeas = AudioEngine.applySmoothing(this.averagedMeas, '1/3');
    const smoothedRef = AudioEngine.applySmoothing(this.averagedRef, '1/3');

    for (let i = 0; i < bins; i++) {
      const delta = smoothedMeas[i] - smoothedRef[i];
      // Limit correction to prevent over-boosting nulls (max 9dB boost, max 12dB cut)
      eq[i] = -Math.max(-12, Math.min(9, delta));
    }
    this.targetEq = eq;
  }

  public setOnDeviceChange(callback: () => void) {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = callback;
    }
  }

  public getProcessedData(smoothing: SmoothingType, averaging: AveragingType, isRef: boolean = false): Float32Array {
    const analyzer = isRef ? this.analyzerRef : this.analyzerMeas;
    const averaged = isRef ? this.averagedRef : this.averagedMeas;
    if (!analyzer || !averaged) return new Float32Array(0);
    const newData = new Float32Array(analyzer.frequencyBinCount);
    analyzer.getFloatFrequencyData(newData);
    if (averaging === 'Exp') {
      const alpha = 0.15; 
      for (let i = 0; i < newData.length; i++) averaged[i] = alpha * newData[i] + (1 - alpha) * averaged[i];
    } else { averaged.set(newData); }
    return AudioEngine.applySmoothing(averaged, smoothing);
  }

  public getTransferFunction(smoothing: SmoothingType): TFData {
    if (!this.analyzerRef || !this.analyzerMeas) return { magnitude: new Float32Array(0), phase: new Float32Array(0), coherence: new Float32Array(0) };
    const bins = this.analyzerMeas.frequencyBinCount;
    const magRef = this.getProcessedData(smoothing, 'Exp', true);
    const magMeas = this.getProcessedData(smoothing, 'Exp', false);
    const tfMag = new Float32Array(bins);
    const phase = new Float32Array(bins);
    const coherence = new Float32Array(bins);
    const delaySec = this.currentDelaySamples / 48000;

    for (let i = 0; i < bins; i++) {
      tfMag[i] = magMeas[i] - magRef[i];
      const freq = (i * 48000) / (bins * 2);
      let p = (360 * freq * delaySec) % 360;
      if (p > 180) p -= 360; if (p < -180) p += 360;
      phase[i] = p;
      coherence[i] = Math.max(0, Math.min(1, (magMeas[i] + 90) / 70));
    }
    return { magnitude: tfMag, phase, coherence, correctionEq: this.targetEq || undefined };
  }

  public resetAveraging() {
    [this.averagedRef, this.averagedMeas].forEach(a => a?.fill(-100));
    this.currentDelaySamples = 0;
    this.lastImpulseResponse = new Float32Array(0);
    this.rt60 = null;
    this.targetEq = null;
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
}
export const audioEngine = new AudioEngine();
