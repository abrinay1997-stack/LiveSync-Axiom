
import { SmoothingType, AveragingType } from '../types';

const processorCode = `
  class CaptureProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
      const input = inputs[0];
      if (input && input[0]) {
        const samples = new Float32Array(input[0]); 
        this.port.postMessage({ samples: samples }, [samples.buffer]); 
      }
      return true;
    }
  }
  registerProcessor('capture-processor', CaptureProcessor);
`;

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onDeviceChangeCallback: (() => void) | null = null;
  
  // Pipeline de promediado
  private averagedData: Float32Array | null = null;
  private framesProcessed: number = 0;

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = () => {
        if (this.onDeviceChangeCallback) this.onDeviceChangeCallback();
      };
    }
  }

  public getAnalyzer(): AnalyserNode | null {
    return this.analyzer;
  }

  public setOnDeviceChange(callback: () => void) {
    this.onDeviceChangeCallback = callback;
  }

  public async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });

      const blob = new Blob([processorCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.ctx.audioWorklet.addModule(url);
    }
    
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  public async startInput(deviceId: string) {
    const context = await this.init();
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };

    try {
      if (this.source) this.stop();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.source = context.createMediaStreamSource(stream);
      this.analyzer = context.createAnalyser();
      this.analyzer.fftSize = 4096;
      this.analyzer.smoothingTimeConstant = 0; // Desactivamos el suavizado nativo para controlarlo nosotros
      
      this.workletNode = new AudioWorkletNode(context, 'capture-processor');
      this.source.connect(this.analyzer);
      this.source.connect(this.workletNode);
      
      this.averagedData = new Float32Array(this.analyzer.frequencyBinCount).fill(-100);
      this.framesProcessed = 0;
    } catch (err) {
      console.error("Audio Start Failure:", err);
      throw err;
    }
  }

  public getProcessedData(smoothing: SmoothingType, averaging: AveragingType): Float32Array {
    if (!this.analyzer || !this.averagedData) return new Float32Array(0);

    const newData = new Float32Array(this.analyzer.frequencyBinCount);
    this.analyzer.getFloatFrequencyData(newData);

    // 1. Temporal Averaging Logic
    for (let i = 0; i < newData.length; i++) {
      if (averaging === 'Inf') {
        this.averagedData[i] = Math.max(this.averagedData[i], newData[i]);
      } else if (averaging === 'Exp') {
        const alpha = 0.15; // Tiempo de respuesta similar a 'Slow'
        this.averagedData[i] = alpha * newData[i] + (1 - alpha) * this.averagedData[i];
      } else {
        this.averagedData[i] = newData[i];
      }
    }

    // 2. Spatial Smoothing
    return AudioEngine.applySmoothing(this.averagedData, smoothing);
  }

  public resetAveraging() {
    if (this.averagedData) this.averagedData.fill(-100);
    this.framesProcessed = 0;
  }

  public stop() {
    if (this.source) {
      const stream = (this.source as any).mediaStream as MediaStream;
      if (stream) stream.getTracks().forEach(t => t.stop());
      this.source.disconnect();
      this.source = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.analyzer) {
      this.analyzer.disconnect();
      this.analyzer = null;
    }
    this.averagedData = null;
  }

  public static applySmoothing(magnitudes: Float32Array, type: SmoothingType): Float32Array {
    if (type === 'none') return magnitudes;
    const windowMap: Record<string, number> = {
      '1/1': 24, '1/3': 12, '1/6': 6, '1/12': 3, '1/24': 2, '1/48': 1
    };
    const winSize = windowMap[type] || 1;
    const smoothed = new Float32Array(magnitudes.length);
    for (let i = 0; i < magnitudes.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - winSize); j <= Math.min(magnitudes.length - 1, i + winSize); j++) {
        sum += magnitudes[j];
        count++;
      }
      smoothed[i] = sum / count;
    }
    return smoothed;
  }
}

export const audioEngine = new AudioEngine();
