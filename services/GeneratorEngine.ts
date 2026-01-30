
import { audioEngine } from './AudioEngine';

export class GeneratorEngine {
  private pinkNoiseSource: AudioBufferSourceNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isSweeping: boolean = false;

  private async ensureContext() {
    const ctx = await audioEngine.init();
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = 0.25; 
      this.gainNode.connect(ctx.destination);
    }
    return ctx;
  }

  public async startPinkNoise() {
    const ctx = await this.ensureContext();
    this.stop();

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    this.pinkNoiseSource = ctx.createBufferSource();
    this.pinkNoiseSource.buffer = buffer;
    this.pinkNoiseSource.loop = true;
    this.pinkNoiseSource.connect(this.gainNode!);
    this.pinkNoiseSource.start();
  }

  /**
   * Ejecuta un barrido de frecuencia logarítmico (20Hz -> 20kHz).
   * Ideal para capturar la respuesta al impulso con alto SNR.
   */
  public async playSineSweep(duration: number = 3.0) {
    const ctx = await this.ensureContext();
    this.stop();
    this.isSweeping = true;

    this.oscillator = ctx.createOscillator();
    this.oscillator.type = 'sine';
    
    const now = ctx.currentTime;
    this.oscillator.frequency.setValueAtTime(20, now);
    this.oscillator.frequency.exponentialRampToValueAtTime(20000, now + duration);
    
    this.oscillator.connect(this.gainNode!);
    this.oscillator.start(now);
    this.oscillator.stop(now + duration);
    
    this.oscillator.onended = () => {
      this.isSweeping = false;
      this.oscillator = null;
    };
  }

  public setGain(value: number) {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(value, audioEngine.ctx!.currentTime, 0.05);
    }
  }

  public getIsSweeping() {
    return this.isSweeping;
  }

  public stop() {
    if (this.pinkNoiseSource) {
      try { this.pinkNoiseSource.stop(); } catch (e) {}
      this.pinkNoiseSource = null;
    }
    if (this.oscillator) {
      try { this.oscillator.stop(); } catch (e) {}
      this.oscillator = null;
    }
    this.isSweeping = false;
  }
}

export const generatorEngine = new GeneratorEngine();
