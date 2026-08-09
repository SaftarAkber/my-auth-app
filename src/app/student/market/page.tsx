"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
}

export default function MarketPage() {
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(d => {
      setProducts(d.products || []);
      setLoading(false);
    });
  }, []);

  async function handleBuy(productId: string) {
    setBuying(productId);
    setMsg("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("✅ Alış-veriş uğurla tamamlandı!");
      await refreshUser();
    } catch (err: unknown) {
      setMsg("❌ " + (err instanceof Error ? err.message : "Xəta"));
    } finally {
      setBuying(null);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Market</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-yellow-800 font-bold text-sm">
          🪙 {user?.coinBalance ?? 0} coin
        </div>
      </div>

      {msg && (
        <p className={`mb-4 text-sm ${msg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{msg}</p>
      )}

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">🛍️</div>
          <p>Hələ məhsul yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-36 bg-gray-100 flex items-center justify-center">
                {p.imageUrl
                  ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  : <span className="text-4xl">🎁</span>}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-blue-900">🪙 {p.price}</span>
                  <button
                    onClick={() => handleBuy(p.id)}
                    disabled={buying === p.id || p.stock <= 0 || (user?.coinBalance ?? 0) < p.price}
                    className="bg-blue-900 hover:bg-blue-800 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
                    {p.stock <= 0 ? "Bitib" : buying === p.id ? "..." : "Al"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}