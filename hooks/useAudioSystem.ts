
import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../services/AudioEngine';

export const useAudioSystem = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const refreshDevices = useCallback(async () => {
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devList.filter(d => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Device enumeration failed", err);
    }
  }, [selectedDevice]);

  useEffect(() => {
    refreshDevices();
    audioEngine.setOnDeviceChange(refreshDevices);
  }, [refreshDevices]);

  const toggleEngine = useCallback(async () => {
    if (isStarted) {
      audioEngine.stop();
      setIsStarted(false);
    } else {
      try {
        await audioEngine.init();
        await audioEngine.startInput(selectedDevice);
        setIsStarted(true);
      } catch (err) {
        console.error("Engine failure", err);
        throw err;
      }
    }
  }, [isStarted, selectedDevice]);

  return {
    isStarted,
    devices,
    selectedDevice,
    setSelectedDevice,
    toggleEngine,
    refreshDevices
  };
};
