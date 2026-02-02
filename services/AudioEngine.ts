
import { SmoothingType, AveragingType, TFData } from '../types';
import { DSPEngine, type AcousticMetricsData } from './DSPEngine';

/**
 * AudioEngine — Audio I/O layer for LiveSync Axiom.
 *
 * Manages:
 * - AudioContext lifecycle and MediaStream input
 * - AudioWorklet for synchronous stereo sample capture
 * - DSPEngine delegation for all spectral analysis
 *
 * The AnalyserNode is NO LONGER used for measurement.
 * All FFT, cross-spectrum, TF, coherence, delay, etc. are computed
 * by DSPEngine from raw time-domain samples.
 */
export class AudioEngine {
  public ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;

  // DSP Engine (the real math)
  public dsp: DSPEngine = new DSPEngine(32768);

  // Sweep state
  private isSweepCapturing: boolean = false;

  // Device change callback
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

  // ─── Public Accessors (backward-compatible) ─────────────────────────────

  /** @deprecated Use dsp.currentDelaySamples */
  get currentDelaySamples(): number { return this.dsp.currentDelaySamples; }
  set currentDelaySamples(v: number) { this.dsp.currentDelaySamples = v; }

  get phaseOffsetMs(): number { return this.dsp.phaseOffsetMs; }
  set phaseOffsetMs(v: number) { this.dsp.phaseOffsetMs = v; }

  get lastImpulseResponse(): Float32Array { return this.dsp.lastImpulseResponse; }
  get acousticMetrics(): AcousticMetricsData | null { return this.dsp.acousticMetrics; }

  // ─── Initialization ─────────────────────────────────────────────────────

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

  // ─── Input Start/Stop ──────────────────────────────────────────────────

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
          channelCount: 2,
        }
      });

      this.source = context.createMediaStreamSource(this.stream);
      this.splitter = context.createChannelSplitter(2);

      this.workletNode = new AudioWorkletNode(context, 'capture-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 2,
        channelCountMode: 'explicit',
      });

      // Feed raw samples into DSPEngine's ring buffers
      this.workletNode.port.onmessage = (e) => {
        const sl: Float32Array = e.data.samplesL;
        const sr: Float32Array = e.data.samplesR;
        this.dsp.pushSamples(sl, sr);
      };

      this.source.connect(this.splitter);
      this.source.connect(this.workletNode);

      // Reset DSP state for clean start
      this.dsp.resetAveraging();
    } catch (err) {
      throw err;
    }
  }

  public stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.source) this.source.disconnect();
    if (this.workletNode) this.workletNode.disconnect();
  }

  // ─── DSP Processing (call from render loop) ────────────────────────────

  /**
   * Process pending audio data. Call this once per animation frame.
   * Drives the DSPEngine block processing for all MTW sizes.
   */
  public processFrame(): void {
    this.dsp.processAllMTW();
    // Also process the user-selected single FFT size if not in MTW set
    const userSize = this.dsp.fftSize;
    const mtwSizes = [16384, 4096, 1024];
    if (!mtwSizes.includes(userSize)) {
      this.dsp.processBlock(userSize);
    }
  }

  // ─── Public API (backward-compatible with components) ──────────────────

  /**
   * Get processed RTA data for a single channel.
   */
  public getProcessedData(
    smoothing: SmoothingType,
    averaging: AveragingType,
    isRef: boolean = false,
    visualGain: number = 0
  ): Float32Array {
    // Configure averaging on the DSP engine
    this.dsp.setAveraging(averaging);
    return this.dsp.getRTAData(smoothing, isRef, visualGain);
  }

  /**
   * Get transfer function with real math (H = Sxy/Sxx).
   */
  public getTransferFunction(smoothing: SmoothingType): TFData {
    return this.dsp.getTransferFunction(smoothing);
  }

  /**
   * Get transfer function using Multi-Time Windowing.
   */
  public getTransferFunctionMTW(smoothing: SmoothingType): TFData {
    return this.dsp.getTransferFunctionMTW(smoothing);
  }

  /**
   * Compute delay via FFT cross-correlation with GCC-PHAT.
   */
  public async computeAutoDelay(): Promise<{ ms: number; meters: number }> {
    return this.dsp.computeAutoDelay();
  }

  // ─── Sweep Capture ────────────────────────────────────────────────────

  public startSweepCapture() {
    this.dsp.startSweepCapture();
    this.isSweepCapturing = true;
  }

  public stopSweepCapture(): Float32Array {
    this.isSweepCapturing = false;
    return this.dsp.stopSweepCapture();
  }

  // ─── Reset ────────────────────────────────────────────────────────────

  public resetAveraging() {
    this.dsp.resetAveraging();
  }

  // ─── Smoothing (static, for backward-compat with AcousticUtils) ──────

  public static applySmoothing(magnitudes: Float32Array, type: SmoothingType): Float32Array {
    if (type === 'none' || !magnitudes.length) return magnitudes;

    const fractionMap: Record<string, number> = {
      '1/1': 1, '1/3': 3, '1/6': 6, '1/12': 12, '1/24': 24, '1/48': 48
    };
    const octaveFraction = fractionMap[type] || 3;
    const bins = magnitudes.length;
    const smoothed = new Float32Array(bins);

    // Convert to linear power for correct averaging
    const linear = new Float64Array(bins);
    for (let i = 0; i < bins; i++) {
      linear[i] = Math.pow(10, magnitudes[i] / 10);
    }

    for (let i = 0; i < bins; i++) {
      const freq = (i * 48000) / (bins * 2);
      if (freq < 20) { smoothed[i] = magnitudes[i]; continue; }

      const ratio = Math.pow(2, 1 / (2 * octaveFraction));
      const freqLow = freq / ratio;
      const freqHigh = freq * ratio;
      const lowBin = Math.max(0, Math.floor((freqLow * bins * 2) / 48000));
      const highBin = Math.min(bins - 1, Math.ceil((freqHigh * bins * 2) / 48000));

      let sum = 0;
      let count = 0;
      for (let j = lowBin; j <= highBin; j++) { sum += linear[j]; count++; }
      smoothed[i] = count > 0 ? 10 * Math.log10(sum / count) : magnitudes[i];
    }
    return smoothed;
  }

  // ─── Level Metering ────────────────────────────────────────────────────

  /**
   * Get peak level in dB for metering.
   */
  public getPeakLevel(isRef: boolean): number {
    const data = this.dsp.getRTAData('none', isRef, 0);
    if (data.length === 0) return -100;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > max) max = data[i];
    }
    return max;
  }

  /**
   * Get live time-domain samples from measurement channel ring buffer.
   */
  public getLiveSamples(): Float32Array {
    return this.dsp.readMeasSamples(16384);
  }
}

export const audioEngine = new AudioEngine();
