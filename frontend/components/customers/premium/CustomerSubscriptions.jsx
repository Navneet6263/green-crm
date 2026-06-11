"use client";

import { useState } from "react";
import DashboardIcon from "../../dashboard/icons";
import { formatIndiaDateTime } from "../../../lib/dateTime";

function money(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN")}`;
}

function calculateProgress(start, end) {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  const now = new Date().getTime();

  if (now >= endDate) return 100;
  if (now <= startDate) return 0;

  const totalDuration = endDate - startDate;
  const elapsed = now - startDate;
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
}

function getDaysRemaining(end) {
  const endDate = new Date(end);
  const now = new Date();
  
  // Reset time part to compare just dates properly
  endDate.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

export default function CustomerSubscriptions({ subscriptions, onAddProduct }) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <DashboardIcon name="package" className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No active products</h3>
        <p className="mt-1 text-sm text-slate-500">This customer hasn't been assigned any products or subscriptions yet.</p>
        <button onClick={onAddProduct} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <DashboardIcon name="plus" className="h-4 w-4" /> Add Product
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">Products & Subscriptions</h2>
        <button onClick={onAddProduct} className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition">
          <DashboardIcon name="plus" className="h-3 w-3" /> Add Product
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {subscriptions.map((sub) => {
          const progress = calculateProgress(sub.start_date, sub.end_date);
          const daysLeft = getDaysRemaining(sub.end_date);
          const isExpiringSoon = daysLeft > 0 && daysLeft <= 10;
          const isExpired = daysLeft <= 0;

          return (
            <div key={sub.subscription_id} className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:shadow-lg ${isExpired ? 'border-rose-100 bg-rose-50/30' : isExpiringSoon ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-white'}`}>
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isExpired ? 'bg-rose-100 text-rose-600' : isExpiringSoon ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    <DashboardIcon name="package" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{sub.product_name}</h3>
                    <p className="text-xs font-semibold text-slate-500">{sub.duration_months} Month{sub.duration_months > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">{money(sub.amount)}</p>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${isExpired ? 'bg-rose-100 text-rose-700' : isExpiringSoon ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Start: {new Date(sub.start_date).toLocaleDateString()}</span>
                  <span className={isExpired ? 'text-rose-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-bold' : ''}>
                    End: {new Date(sub.end_date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>{progress.toFixed(0)}% Completed</span>
                  <span className={isExpired ? 'text-rose-500' : isExpiringSoon ? 'text-amber-500' : ''}>
                    {isExpired ? 'Expired' : `${daysLeft} Days Left`}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
