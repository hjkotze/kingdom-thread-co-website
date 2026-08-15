import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminLayout from "../components/admin/AdminLayout";
import AdminConfigTabs from "../components/admin/AdminConfigTabs";
import { listAdminProducts } from "../lib/api/adminProducts";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAdminProducts()
      .then((data) => {
        if (!cancelled) setProducts(data.products);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminLayout>
      <AdminConfigTabs />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Products
        </h1>
        <Link
          to="/admin/configuration/products/new"
          className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ borderRadius: "var(--radius)" }}
        >
          Add product
        </Link>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}

      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/admin/configuration/products/${product.id}`}
            className="bg-card border border-border p-4 flex items-center justify-between gap-4 hover:border-accent transition-colors"
            style={{ borderRadius: "var(--radius)" }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-12 h-12 shrink-0 border border-border overflow-hidden bg-secondary"
                style={{ borderRadius: "var(--radius)" }}
              >
                {product.images?.[0] && <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-foreground font-medium mb-1 truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.categoryLabel || "No category"} · R{product.price ?? "—"}
                </p>
              </div>
            </div>
            {!product.active && (
              <span
                className="text-xs px-3 py-1 shrink-0"
                style={{ borderRadius: "var(--radius)", background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                Inactive
              </span>
            )}
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
