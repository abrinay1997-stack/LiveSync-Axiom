
import React from 'react';
import { BarChart3, GitCompare, ShieldAlert, Timer, Settings, Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isStarted: boolean;
  onToggleEngine: () => void;
  onOpenConfig: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isStarted, onToggleEngine, onOpenConfig }) => {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#050505] border-b border-white/5 z-50 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 group cursor-pointer">
          <img 
            src="https://hostedimages-cdn.aweber-static.com/MjM0MTQ0NQ==/optimized/20657f92efa544489526caee3beef9d2.png" 
            alt="Logo"
            className="w-7 h-7 object-contain opacity-90"
          />
          <div className="flex flex-col leading-none">
            <h1 className="text-sm font-black tracking-tighter flex items-center gap-1">
              <span className="text-white">LiveSync</span>
              <span className="text-cyan-400">AXIOM</span>
            </h1>
          </div>
        </div>
        
        <nav className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
          {[
            { id: 'rta', icon: <BarChart3 size={12} />, label: 'RTA' },
            { id: 'tf', icon: <GitCompare size={12} />, label: 'Transfer' },
            { id: 'impulse', icon: <Timer size={12} />, label: 'Impulse' },
            { id: 'security', icon: <ShieldAlert size={12} />, label: 'Security' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black rounded-lg border border-white/5 mr-4">
           <Activity size={12} className={isStarted ? "text-emerald-500 animate-pulse" : "text-slate-700"} />
           <span className="text-[9px] mono font-bold text-slate-500 uppercase">Input Sync</span>
        </div>

        <button 
          onClick={onOpenConfig}
          className="p-2 text-slate-500 hover:text-white transition-colors"
        >
          <Settings size={16} />
        </button>
        
        <button 
          onClick={onToggleEngine}
          className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isStarted ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-white text-black hover:bg-cyan-400'}`}
        >
          {isStarted ? 'STOP ENGINE' : 'RUN ENGINE'}
        </button>
      </div>
    </header>
  );
};

export default Header;
