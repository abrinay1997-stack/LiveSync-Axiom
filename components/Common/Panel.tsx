
import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  rightElement?: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ children, title, subtitle, icon, className = "", rightElement }) => {
  return (
    <div className={`bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col min-h-0 ${className}`}>
      {/* Top Glow Border */}
      <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
      
      {(title || icon) && (
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="text-cyan-400 shrink-0">{icon}</div>}
            <div className="min-w-0">
              {title && <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em] truncate">{title}</h3>}
              {subtitle && <p className="text-[8px] text-slate-600 mono uppercase tracking-tighter truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="shrink-0">{rightElement}</div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};

export default Panel;
