
import { useEffect } from 'react';

interface HotkeyMap {
  [key: string]: () => void;
}

export const useHotkeys = (hotkeys: HotkeyMap) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar disparar atajos si el usuario está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (hotkeys[e.code]) {
        e.preventDefault();
        hotkeys[e.code]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys]);
};
