
import { useState, useCallback, useEffect } from 'react';
import { MeasurementConfig, SmoothingType, AveragingType } from '../types';
import { DEFAULT_CONFIG } from '../constants';

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

  return {
    config,
    updateConfig,
    setSmoothing,
    setAveraging,
    setDbRange
  };
};
