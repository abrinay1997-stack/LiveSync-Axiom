
import React from 'react';
import { BarChart3, GitCompare, ShieldAlert, Timer } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isStarted: boolean;
  onToggleEngine: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isStarted, onToggleEngine }) => {
  return (
    <header className="h-20 flex items-center justify-between px-8 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 shrink-0">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-4 group">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <img 
              src="https://hostedimages-cdn.aweber-static.com/MjM0MTQ0NQ==/optimized/20657f92efa544489526caee3beef9d2.png" 
              alt="LiveSync Logo"
              className="relative w-full h-full object-contain opacity-90 transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-[0.1em] flex items-center gap-1">
              <span className="text-white">LiveSync</span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PRO</span>
            </h1>
            <p className="text-[#666] text-[8px] uppercase tracking-[0.3em] mt-0.5">System Engineering Suite</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {[
            { id: 'rta', icon: <BarChart3 size={14} />, label: 'RTA' },
            { id: 'tf', icon: <GitCompare size={14} />, label: 'Transfer' },
            { id: 'impulse', icon: <Timer size={14} />, label: 'Impulse' },
            { id: 'security', icon: <ShieldAlert size={14} />, label: 'Security' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
         <button 
          onClick={onToggleEngine}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isStarted ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-400' : 'bg-white text-black hover:bg-slate-200 shadow-white/5'}`}
        >
          {isStarted ? 'ENGINE ON' : 'ENGINE OFF'}
        </button>
      </div>
    </header>
  );
};

export default Header;
