
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
    <div className={`bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col ${className}`}>
      {/* Top Glow Border */}
      <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
      
      {(title || icon) && (
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            {icon && <div className="text-cyan-400">{icon}</div>}
            <div>
              {title && <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">{title}</h3>}
              {subtitle && <p className="text-[9px] text-slate-500 mono uppercase tracking-tighter">{subtitle}</p>}
            </div>
          </div>
          {rightElement}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};

export default Panel;
