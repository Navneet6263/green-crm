"use client";

import { T } from "./lead-form-tokens";

export function LeadFormSidebar({ quickProductPicks, productHelperMessage, form, onPickProduct }) {
  return (
    <div className="space-y-4 xl:sticky xl:top-6">
      {/* Quick product picks */}
      <div className={T.panel + " px-5 py-5"}>
        <p className={T.kicker}>Quick Picks</p>
        <h3 className="mt-0.5 mb-4 text-sm font-bold text-slate-900">Select Product</h3>
        {quickProductPicks.length ? (
          <div className="space-y-2">
            {quickProductPicks.map(item => (
              <button
                key={item.product_id}
                type="button"
                onClick={() => onPickProduct(item.product_id)}
                className={`group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                  form.product_id === item.product_id
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-100 bg-white hover:border-amber-200"
                }`}
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{item.subtitle}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{productHelperMessage || "No products available."}</p>
        )}
      </div>
    </div>
  );
}
