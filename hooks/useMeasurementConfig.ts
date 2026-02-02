
import { useState, useCallback, useEffect } from 'react';
import { MeasurementConfig, SmoothingType, AveragingType, WindowType, MicCalibration } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { audioEngine } from '../services/AudioEngine';

const STORAGE_KEY = 'livesync_measure_config';

export const useMeasurementConfig = () => {
  const [config, setConfig] = useState<MeasurementConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Sync DSP engine whenever relevant config changes
  useEffect(() => {
    audioEngine.dsp.fftSize = config.fftSize;
    audioEngine.dsp.setWindow(config.windowType);
    audioEngine.dsp.setAveraging(config.averaging, config.averagingCount);
    audioEngine.dsp.setMicCalibration(config.micCalibration);
  }, [config.fftSize, config.windowType, config.averaging, config.averagingCount, config.micCalibration]);

  const updateConfig = useCallback((updates: Partial<MeasurementConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const setSmoothing = useCallback((smoothing: SmoothingType) => {
    updateConfig({ smoothing });
  }, [updateConfig]);

  const setAveraging = useCallback((averaging: AveragingType) => {
    updateConfig({ averaging });
  }, [updateConfig]);

  const setDbRange = useCallback((minDb: number, maxDb: number) => {
    updateConfig({ minDb, maxDb });
  }, [updateConfig]);

  const setWindowType = useCallback((windowType: WindowType) => {
    updateConfig({ windowType });
  }, [updateConfig]);

  const setFFTSize = useCallback((fftSize: number) => {
    updateConfig({ fftSize });
  }, [updateConfig]);

  const setMTW = useCallback((useMTW: boolean) => {
    updateConfig({ useMTW });
  }, [updateConfig]);

  const setMicCalibration = useCallback((micCalibration: MicCalibration | null) => {
    updateConfig({ micCalibration });
  }, [updateConfig]);

  return {
    config,
    updateConfig,
    setSmoothing,
    setAveraging,
    setDbRange,
    setWindowType,
    setFFTSize,
    setMTW,
    setMicCalibration,
  };
};
