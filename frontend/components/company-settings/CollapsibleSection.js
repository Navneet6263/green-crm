import { useState } from "react";
import DashboardIcon from "../dashboard/icons";

export default function CollapsibleSection({ 
  title, 
  subtitle, 
  children, 
  defaultOpen = true,
  badge = null 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {badge && (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <DashboardIcon name="chevron-down" className="h-5 w-5 text-brand-700" />
        </div>
      </button>
      
      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
