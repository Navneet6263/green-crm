"use client";

import { useEffect, useState, useMemo } from "react";
import { apiRequest } from "../../lib/api";
import { recentActivityApi } from "../../lib/api/recentActivity.js";

export default function RecentUpdatesFilter({ 
  session, 
  fromDate,
  toDate,
  selectedUsers, 
  setSelectedUsers, 
  selectedProducts, 
  setSelectedProducts 
}) {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [allNotesForCounts, setAllNotesForCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user & product lists
  useEffect(() => {
    if (!session) return;
    const loadFilters = async () => {
      try {
        const [usersRes, productsRes] = await Promise.all([
          apiRequest("/users?page_size=200", { token: session.token }),
          apiRequest("/products", { token: session.token })
        ]);
        setUsers(usersRes.items || usersRes || []);
        setProducts(productsRes.items || productsRes.data || productsRes || []);
      } catch (err) {
        console.error("Failed to load filter options", err);
      } finally {
        setLoading(false);
      }
    };
    loadFilters();
  }, [session]);

  // Fetch full notes dataset for current date range to compute accurate per-user counts
  useEffect(() => {
    if (!session) return;
    const fetchCountsData = async () => {
      try {
        const res = await recentActivityApi.getRecentNotes({
          limit: 10000,
          page: 1,
          fromDate,
          toDate
        });
        const items = res.items || res.data || (Array.isArray(res) ? res : []);
        setAllNotesForCounts(items);
      } catch (err) {
        console.error("Failed to fetch notes for counts", err);
      }
    };
    fetchCountsData();
  }, [session, fromDate, toDate]);

  // Compute accurate per-user count map (matches by ID & Name)
  const userCounts = useMemo(() => {
    const map = {};
    allNotesForCounts.forEach((n) => {
      if (n.created_by) {
        const idKey = String(n.created_by).trim();
        map[idKey] = (map[idKey] || 0) + 1;
      }
      if (n.created_by_name) {
        const nameKey = String(n.created_by_name).trim().toLowerCase();
        map[nameKey] = (map[nameKey] || 0) + 1;
      }
    });
    return map;
  }, [allNotesForCounts]);

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const toggleProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  return (
    <div className="w-full sm:w-64 shrink-0 space-y-6">
      {/* Users Filter */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Filter by Name</h3>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Updates</span>
        </div>
        {!["admin", "manager", "super-admin", "platform-admin", "platform-manager"].includes(session?.user?.role || session?.role) ? (
          <div className="rounded-xl bg-indigo-50/70 p-3 text-xs font-semibold text-indigo-700 border border-indigo-100 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            Showing your own activity notes
          </div>
        ) : loading ? (
          <div className="text-xs text-slate-400">Loading names...</div>
        ) : users.length === 0 ? (
          <div className="text-xs text-slate-400">No users found.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {users.map(user => {
              const uId = user.user_id || user.id;
              const idKey = String(uId || "").trim();
              const nameKey = String(user.name || "").trim().toLowerCase();
              const count = userCounts[idKey] || userCounts[nameKey] || 0;

              return (
                <label key={uId} className="flex items-center justify-between gap-2 cursor-pointer group">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="relative flex items-center shrink-0">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={selectedUsers.includes(uId)}
                        onChange={() => toggleUser(uId)}
                      />
                      <div className="h-4.5 w-4.5 rounded border border-slate-300 bg-white transition-all peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-600/20 group-hover:border-indigo-400" />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-slate-700 transition-colors group-hover:text-slate-900 truncate">
                      {user.name}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border shrink-0 ${
                    count > 0 ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  }`}>
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Products Filter */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Filter by Product</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-xs text-slate-400">No products found.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {products.map(product => (
              <label key={product.product_id || product.id} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={selectedProducts.includes(product.product_id || product.id)}
                    onChange={() => toggleProduct(product.product_id || product.id)}
                  />
                  <div className="h-4.5 w-4.5 rounded border border-slate-300 bg-white transition-all peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-600/20 group-hover:border-indigo-400" />
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700 transition-colors group-hover:text-slate-900">{product.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
