"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function ProductSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", color: "#22c55e" });
  const [error, setError] = useState("");

  async function loadProducts(activeSession) {
    const response = await apiRequest("/products?page_size=20", { token: activeSession.token });
    setProducts(response.items || []);
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!["super-admin", "admin"].includes(activeSession.user?.role)) {
      router.replace("/dashboard");
      return;
    }
    setSession(activeSession);
    loadProducts(activeSession).catch((requestError) => setError(requestError.message));
  }, [router]);

  async function createProduct(event) {
    event.preventDefault();
    setError("");

    try {
      await apiRequest("/products", {
        method: "POST",
        token: session.token,
        body: form,
      });
      setForm({ name: "", color: "#22c55e" });
      await loadProducts(session);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const heroStats = [
    { label: "Products", value: products.length },
    { label: "Branded", value: products.filter((product) => Boolean(product.color)).length, color: "#1fc778" },
    { label: "Unique Colors", value: new Set(products.map((product) => product.color).filter(Boolean)).size, color: "#4f8cff" },
    { label: "Draft Slot", value: form.name ? "Ready" : "Empty", color: form.name ? "#f4a42d" : "#94a3b8" },
  ];

  return (
    <DashboardShell session={session} title="Product Settings" eyebrow="Company Products" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header"><h2>Create Product</h2></div>
          <form className="form-grid" onSubmit={createProduct}>
            <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label className="field"><span>Color</span><input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} /></label>
            <button className="button primary" type="submit">Create Product</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header"><h2>Products</h2></div>
          <div className="table-stack">
            {products.length ? products.map((product) => (
              <div className="table-row" key={product.product_id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.product_id}</span>
                </div>
                <strong style={{ color: product.color }}>{product.color}</strong>
              </div>
            )) : <p className="muted">No products found.</p>}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
