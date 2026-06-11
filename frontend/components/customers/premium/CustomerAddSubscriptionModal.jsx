"use client";

import { useState, useEffect } from "react";
import DashboardIcon from "../../dashboard/icons";

export default function CustomerAddSubscriptionModal({ isOpen, onClose, onSave, products }) {
  const [productId, setProductId] = useState("");
  const [amount, setAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("12");
  const [startDate, setStartDate] = useState("");

  // Set default start date to today
  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split("T")[0]);
      setProductId("");
      setAmount("");
      setDurationMonths("12");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productId || !startDate) return;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(durationMonths, 10));

    onSave({
      product_id: productId,
      amount: parseFloat(amount || 0),
      duration_months: parseInt(durationMonths, 10),
      start_date: start.toISOString(),
      end_date: end.toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DashboardIcon name="package" className="h-5 w-5" /> Add Subscription
          </h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Product</span>
            <select
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select a product...</option>
              {products?.map((p) => (
                <option key={p.product_id} value={p.product_id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Amount Collected (₹)</span>
            <input
              type="number"
              step="0.01"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Duration (Months)</span>
              <input
                type="number"
                min="1"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Start Date</span>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-8 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-[0_4px_15px_rgba(79,70,229,0.3)]">
              Confirm & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
