
/**
 * WatermarkEngine: Implementación de DSP para Audio Watermarking.
 * Optimizada para escaneo continuo y detección de confianza.
 */
export class WatermarkEngine {
  
  private static generatePNSequence(size: number, key: number): Float32Array {
    const sequence = new Float32Array(size);
    let seed = key;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < size; i++) {
      sequence[i] = lcg() > 0.5 ? 1 : -1;
    }
    return sequence;
  }

  private static haarDWT(data: Float32Array): [Float32Array, Float32Array] {
    const n = data.length;
    const half = Math.floor(n / 2);
    const approx = new Float32Array(half);
    const detail = new Float32Array(half);
    const invSqrt2 = 1 / Math.sqrt(2);

    for (let i = 0; i < half; i++) {
      approx[i] = (data[2 * i] + (data[2 * i + 1] || 0)) * invSqrt2;
      detail[i] = (data[2 * i] - (data[2 * i + 1] || 0)) * invSqrt2;
    }
    return [approx, detail];
  }

  private static iHaarDWT(approx: Float32Array, detail: Float32Array): Float32Array {
    const n = approx.length * 2;
    const result = new Float32Array(n);
    const invSqrt2 = 1 / Math.sqrt(2);

    for (let i = 0; i < approx.length; i++) {
      result[2 * i] = (approx[i] + detail[i]) * invSqrt2;
      result[2 * i + 1] = (approx[i] - detail[i]) * invSqrt2;
    }
    return result;
  }

  public static embed(audioBuffer: Float32Array, alpha: number, key: number): Float32Array {
    const [cA1, cD1] = this.haarDWT(audioBuffer);
    const [cA2, cD2] = this.haarDWT(cA1);
    const pn = this.generatePNSequence(cD2.length, key);
    
    for (let i = 0; i < cD2.length; i++) {
      cD2[i] = cD2[i] + alpha * pn[i];
    }
    
    const rcA1 = this.iHaarDWT(cA2, cD2);
    return this.iHaarDWT(rcA1, cD1);
  }

  /**
   * Extracción con normalización de energía para evitar falsos positivos por volumen.
   */
  public static extract(audioBuffer: Float32Array, key: number): number {
    if (audioBuffer.length < 1024) return 0;
    
    const [cA1, cD1] = this.haarDWT(audioBuffer);
    const [cA2, cD2] = this.haarDWT(cA1);
    const pn = this.generatePNSequence(cD2.length, key);
    
    let correlation = 0;
    let energy = 0;
    for (let i = 0; i < cD2.length; i++) {
      correlation += cD2[i] * pn[i];
      energy += Math.abs(cD2[i]);
    }
    
    // Score normalizado por la energía de la subbanda
    return energy === 0 ? 0 : (correlation / energy) * 10;
  }

  public static calculatePSNR(original: Float32Array, watermarked: Float32Array): number {
    let mse = 0;
    const len = Math.min(original.length, watermarked.length);
    for (let i = 0; i < len; i++) {
      mse += Math.pow(original[i] - watermarked[i], 2);
    }
    mse /= len;
    return mse === 0 ? 100 : 10 * Math.log10(1 / mse);
  }
}
