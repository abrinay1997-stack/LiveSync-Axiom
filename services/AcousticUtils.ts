
import { SmoothingType } from '../types';
import { AudioEngine } from './AudioEngine';

/**
 * AcousticUtils: Funciones puras para procesamiento de señales
 * Separadas de la gestión de hardware para facilitar pruebas y mantenimiento.
 */
export const AcousticUtils = {
  
  /**
   * Genera una curva de EQ inversa basada en la diferencia entre medición y referencia.
   */
  computeInverseEQ(meas: Float32Array, ref: Float32Array): Float32Array {
    const bins = meas.length;
    const eq = new Float32Array(bins);
    
    // Aplicamos un suavizado de 1/3 de octava para la corrección (evita correcciones quirúrgicas inestables)
    const smoothedMeas = AudioEngine.applySmoothing(meas, '1/3');
    const smoothedRef = AudioEngine.applySmoothing(ref, '1/3');

    for (let i = 0; i < bins; i++) {
      const delta = smoothedMeas[i] - smoothedRef[i];
      // Limitadores de seguridad: Max +9dB boost, Max -12dB cut
      // No queremos quemar drivers intentando corregir nulos físicos (cero acústico)
      eq[i] = -Math.max(-12, Math.min(9, delta));
    }
    return eq;
  },

  /**
   * Convierte muestras de delay a metros basándose en la velocidad del sonido (343 m/s @ 20°C)
   */
  samplesToMeters(samples: number, sampleRate: number): number {
    return (samples / sampleRate) * 343;
  },

  /**
   * Convierte muestras de delay a milisegundos
   */
  samplesToMs(samples: number, sampleRate: number): number {
    return (samples / sampleRate) * 1000;
  }
};
