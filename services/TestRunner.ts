
import { AudioEngine } from './AudioEngine';
import { AcousticUtils } from './AcousticUtils';

export interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  message: string;
  duration: number;
}

/**
 * TestRunner: Suite de pruebas de integridad para LiveSync Axiom.
 * Ejecuta validaciones matemáticas sobre los algoritmos core.
 */
export class TestRunner {
  public static async runAll(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const runTest = async (name: string, fn: () => void | Promise<void>) => {
      const start = performance.now();
      try {
        await fn();
        results.push({ name, status: 'passed', message: 'OK', duration: performance.now() - start });
      } catch (e: any) {
        results.push({ name, status: 'failed', message: e.message || 'Error desconocido', duration: performance.now() - start });
      }
    };

    // 1. Test de Suavizado DSP
    await runTest('DSP: Octave Smoothing Integrity', () => {
      const input = new Float32Array(1024).fill(-20);
      const output = AudioEngine.applySmoothing(input, '1/3');
      if (output.length !== input.length) throw new Error('El tamaño del buffer cambió tras el suavizado');
      if (isNaN(output[512])) throw new Error('El suavizado produjo valores NaN');
    });

    // 2. Test de Utilidades Acústicas
    await runTest('Acoustics: Conversion Math', () => {
      const samples = 480; // 10ms a 48kHz
      const ms = AcousticUtils.samplesToMs(samples, 48000);
      const meters = AcousticUtils.samplesToMeters(samples, 48000);
      
      if (ms !== 10) throw new Error(`Error en MS: ${ms} (Esperado 10)`);
      if (Math.abs(meters - 3.43) > 0.01) throw new Error(`Error en metros: ${meters} (Esperado ~3.43)`);
    });

    return results;
  }
}
