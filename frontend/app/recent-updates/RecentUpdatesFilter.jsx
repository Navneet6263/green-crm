"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function RecentUpdatesFilter({ 
  session, 
  selectedUsers, 
  setSelectedUsers, 
  selectedProducts, 
  setSelectedProducts 
}) {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <h3 className="mb-3 text-sm font-bold text-slate-900">Filter by Name</h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading names...</div>
        ) : users.length === 0 ? (
          <div className="text-xs text-slate-400">No users found.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {users.map(user => (
              <label key={user.user_id || user.id} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={selectedUsers.includes(user.user_id || user.id)}
                    onChange={() => toggleUser(user.user_id || user.id)}
                  />
                  <div className="h-5 w-5 rounded border border-slate-300 bg-white transition-all peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-600/20 group-hover:border-indigo-400" />
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">{user.name}</span>
              </label>
            ))}
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
                  <div className="h-5 w-5 rounded border border-slate-300 bg-white transition-all peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-600/20 group-hover:border-indigo-400" />
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">{product.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
