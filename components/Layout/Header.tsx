
import React from 'react';
import { 
  BarChart3, GitCompare, ShieldAlert, Timer, Settings, Activity, 
  PanelLeft, PanelBottom, PanelRight, HelpCircle 
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isStarted: boolean;
  onToggleEngine: () => void;
  onOpenConfig: () => void;
  layout: {
    sidebar: boolean;
    bottom: boolean;
    knowledge: boolean;
    setSidebar: (v: boolean) => void;
    setBottom: (v: boolean) => void;
    setKnowledge: (v: boolean) => void;
  };
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isStarted, onToggleEngine, onOpenConfig, layout }) => {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#050505] border-b border-white/5 z-50 shrink-0 shadow-xl">
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
            <div key={tab.id} className="flex items-center relative group/tab">
              <button 
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                {tab.icon} {tab.label}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(tab.id as any);
                  layout.setKnowledge(true);
                }}
                className={`p-1.5 ml-0.5 rounded hover:bg-white/10 transition-colors ${activeTab === tab.id ? 'text-black/50 hover:text-black' : 'text-slate-700 hover:text-cyan-400'}`}
                title={`Help for ${tab.label}`}
              >
                <HelpCircle size={10} />
              </button>
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Layout Toggles (DAW Style) */}
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 mr-4">
          <button 
            onClick={() => layout.setSidebar(!layout.sidebar)}
            className={`p-2 rounded-lg transition-all ${layout.sidebar ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-600 hover:text-slate-300'}`}
            title="Toggle Left Sidebar"
          >
            <PanelLeft size={16} />
          </button>
          <button 
            onClick={() => layout.setBottom(!layout.bottom)}
            className={`p-2 rounded-lg transition-all ${layout.bottom ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-600 hover:text-slate-300'}`}
            title="Toggle Bottom Panel"
          >
            <PanelBottom size={16} />
          </button>
          <button 
            onClick={() => layout.setKnowledge(!layout.knowledge)}
            className={`p-2 rounded-lg transition-all ${layout.knowledge ? 'text-cyan-400 bg-cyan-400/10 shadow-[inset_0_0_8px_rgba(34,211,238,0.2)]' : 'text-slate-600 hover:text-slate-300'}`}
            title="Toggle Help Panel"
          >
            <PanelRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-black rounded-lg border border-white/5 mr-2 h-9">
           <Activity size={12} className={isStarted ? "text-emerald-500 animate-pulse" : "text-slate-700"} />
           <span className="text-[9px] mono font-bold text-slate-500 uppercase">Input Sync</span>
        </div>

        <button 
          onClick={onOpenConfig}
          className="p-2 text-slate-500 hover:text-white transition-colors mr-2"
        >
          <Settings size={18} />
        </button>
        
        <button 
          onClick={onToggleEngine}
          className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isStarted ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-white text-black hover:bg-cyan-400'}`}
        >
          {isStarted ? 'STOP ENGINE' : 'RUN ENGINE'}
        </button>
      </div>
    </header>
  );
};

export default Header;
