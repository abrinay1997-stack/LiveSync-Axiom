
/**
 * WatermarkEngine: Implementación de DSP para Audio Watermarking.
 * Utiliza DWT Nivel 2 (Haar) y secuencias PN Antipodales.
 */
export class WatermarkEngine {
  
  // Genera una secuencia PN (Pseudo-Noise) antipodal (+1, -1)
  private static generatePNSequence(size: number, key: number): Float32Array {
    const sequence = new Float32Array(size);
    // LCG simple para reproducibilidad basada en Key (semilla)
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

  /**
   * DWT Haar (Nivel 1)
   * Devuelve [Aproximación, Detalle]
   */
  private static haarDWT(data: Float32Array): [Float32Array, Float32Array] {
    const n = data.length;
    const half = Math.floor(n / 2);
    const approx = new Float32Array(half);
    const detail = new Float32Array(half);
    const invSqrt2 = 1 / Math.sqrt(2);

    for (let i = 0; i < half; i++) {
      approx[i] = (data[2 * i] + data[2 * i + 1]) * invSqrt2;
      detail[i] = (data[2 * i] - data[2 * i + 1]) * invSqrt2;
    }
    return [approx, detail];
  }

  /**
   * Inverse DWT Haar (Nivel 1)
   */
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

  /**
   * Embed: Inserta la marca en los coeficientes cD2
   */
  public static embed(audioBuffer: Float32Array, alpha: number, key: number): Float32Array {
    // 1. Nivel 1
    const [cA1, cD1] = this.haarDWT(audioBuffer);
    // 2. Nivel 2
    const [cA2, cD2] = this.haarDWT(cA1);
    
    // 3. Generar marca para cD2
    const pn = this.generatePNSequence(cD2.length, key);
    
    // 4. Inserción aditiva: Y = X + alpha * W
    for (let i = 0; i < cD2.length; i++) {
      cD2[i] = cD2[i] + alpha * pn[i];
    }
    
    // 5. Reconstrucción
    const rcA1 = this.iHaarDWT(cA2, cD2);
    const result = this.iHaarDWT(rcA1, cD1);
    
    return result;
  }

  /**
   * Extract: Correlación cruzada para detección ciega
   */
  public static extract(audioBuffer: Float32Array, key: number): number {
    const [cA1, cD1] = this.haarDWT(audioBuffer);
    const [cA2, cD2] = this.haarDWT(cA1);
    
    const pn = this.generatePNSequence(cD2.length, key);
    
    let correlation = 0;
    for (let i = 0; i < cD2.length; i++) {
      correlation += cD2[i] * pn[i];
    }
    
    // Score normalizado por longitud
    return correlation / cD2.length;
  }

  /**
   * Calcula el PSNR para medir invisibilidad
   */
  public static calculatePSNR(original: Float32Array, watermarked: Float32Array): number {
    let mse = 0;
    for (let i = 0; i < original.length; i++) {
      mse += Math.pow(original[i] - watermarked[i], 2);
    }
    mse /= original.length;
    if (mse === 0) return 100;
    return 10 * Math.log10(1 / mse);
  }
}
