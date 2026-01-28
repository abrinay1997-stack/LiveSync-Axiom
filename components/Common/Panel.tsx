
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
    <div className={`bg-slate-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col ${className}`}>
      {(title || icon) && (
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            {icon && <div className="text-cyan-400">{icon}</div>}
            <div>
              {title && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>}
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
