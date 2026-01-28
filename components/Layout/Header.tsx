
import React from 'react';
import { Activity, BarChart3, GitCompare, ShieldAlert, Command } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isStarted: boolean;
  onToggleEngine: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isStarted, onToggleEngine }) => {
  return (
    <header className="h-12 flex items-center justify-between px-6 bg-slate-950 border-b border-white/5 z-50 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-cyan-500 rounded flex items-center justify-center">
            <Activity size={12} className="text-black" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-white">LiveSync <span className="text-cyan-400">Pro</span></span>
        </div>
        
        <nav className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5">
          {[
            { id: 'rta', icon: <BarChart3 size={14} />, label: 'RTA' },
            { id: 'tf', icon: <GitCompare size={14} />, label: 'Transfer' },
            { id: 'security', icon: <ShieldAlert size={14} />, label: 'Trace' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
         <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
           <Command size={10} /> 
           <span>Space: Capture | G: Noise | B: Sidebar</span>
         </div>
         <button 
          onClick={onToggleEngine}
          className={`px-4 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg ${isStarted ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-black shadow-emerald-500/20'}`}
        >
          {isStarted ? 'ENGINE ON' : 'ENGINE OFF'}
        </button>
      </div>
    </header>
  );
};

export default Header;
