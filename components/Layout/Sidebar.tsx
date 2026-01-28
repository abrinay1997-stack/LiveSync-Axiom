
import React from 'react';
import Meter from '../Meter';
import SignalGenerator from '../SignalGenerator';
import SnapshotManager from '../SnapshotManager';
import { TraceData } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  traces: TraceData[];
  onCapture: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  isEngineStarted: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  traces, 
  onCapture, 
  onDelete, 
  onRename,
  onToggleVisibility,
  isEngineStarted
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r border-white/5 bg-[#050505] flex flex-col gap-4 overflow-hidden p-4 shrink-0 transition-all shadow-2xl">
      <Meter />
      
      <SignalGenerator />
      
      <div className="flex-1 min-h-0 flex flex-col">
        <SnapshotManager 
          traces={traces}
          onCapture={onCapture}
          onDelete={onDelete}
          onRename={onRename}
          onToggleVisibility={onToggleVisibility}
          isEngineStarted={isEngineStarted}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
