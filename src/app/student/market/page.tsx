"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx, fmtDate } from "@/lib/format";
import { ORDER_STATUS } from "@/components/content";
import {
  CoinPill, Empty, Icon, Img, Modal, PageHeader, SkeletonList, Spinner, Tabs, useToast,
} from "@/components/ui";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
}
interface Order {
  id: string;
  quantity: number;
  totalCost: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DELIVERED";
  createdAt: string;
  product: Product;
}

export default function StudentMarketPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const products = useFetch<{ products: Product[] }>("/api/products");
  const orders = useFetch<{ orders: Order[] }>("/api/orders");
  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [buying, setBuying] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const balance = user?.coinBalance ?? 0;

  async function buy() {
    if (!buying) return;
    setBusy(true);
    try {
      await api("/api/orders", { body: { productId: buying.id, quantity: qty } });
      toast.success("Sifariş verildi! Müəllim təsdiq edəcək.");
      setBuying(null);
      await Promise.all([refreshUser(), products.reload(), orders.reload()]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const list = products.data?.products ?? [];
  const myOrders = orders.data?.orders ?? [];
  const total = buying ? buying.price * qty : 0;

  return (
    <div className="page">
      <PageHeader title="Market" subtitle="Qazandığınız coinləri mükafatlara dəyişin" actions={<CoinPill amount={balance} className="!px-4 !py-2 !text-base" />} />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "shop", label: "Məhsullar", count: list.length },
          { id: "orders", label: "Sifarişlərim", count: myOrders.length },
        ]}
      />

      {tab === "shop" ? (
        products.loading ? (
          <SkeletonList rows={3} className="h-56" />
        ) : list.length === 0 ? (
          <Empty icon="bag" title="Hələ məhsul yoxdur" text="Müəllim məhsul əlavə etdikdə burada görünəcək." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const out = p.stock <= 0;
              const afford = balance >= p.price;
              return (
                <article key={p.id} className="card flex flex-col overflow-hidden transition hover:-translate-y-0.5">
                  <div className="relative aspect-[4/3] bg-surface-2">
                    {p.imageUrl ? (
                      <Img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-muted"><Icon name="bag" size={40} /></span>
                    )}
                    {out && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">Stokda yoxdur</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold">{p.name}</h3>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <CoinPill amount={p.price} />
                      <span className="text-xs text-muted">{p.stock} ədəd</span>
                    </div>
                    <button
                      className="btn-primary mt-3 w-full"
                      disabled={out || !afford}
                      onClick={() => { setBuying(p); setQty(1); }}
                    >
                      {out ? "Stokda yoxdur" : afford ? "Al" : "Coin çatmır"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : orders.loading ? (
        <SkeletonList />
      ) : myOrders.length === 0 ? (
        <Empty icon="inbox" title="Hələ sifariş yoxdur" />
      ) : (
        <div className="space-y-3">
          {myOrders.map((o) => (
            <div key={o.id} className="card flex items-center gap-4 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 text-muted">
                {o.product.imageUrl ? <Img src={o.product.imageUrl} className="h-full w-full object-cover" /> : <Icon name="bag" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{o.product.name} <span className="text-muted">× {o.quantity}</span></p>
                <p className="text-xs text-muted">{fmtDate(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <CoinPill amount={o.totalCost} />
                <p className="mt-1.5"><span className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!buying}
        onClose={() => setBuying(null)}
        title="Sifarişi təsdiqlə"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setBuying(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={buy} disabled={busy || total > balance}>
              {busy ? <Spinner /> : `${total} coin ödə`}
            </button>
          </>
        }
      >
        {buying && (
          <div className="space-y-4">
            <p className="font-bold">{buying.name}</p>
            <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
              <span className="text-sm font-semibold">Miqdar</span>
              <div className="flex items-center gap-3">
                <button className="btn-icon bg-surface" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span className="w-6 text-center font-bold">{qty}</span>
                <button className="btn-icon bg-surface" onClick={() => setQty((q) => Math.min(buying.stock, 20, q + 1))}>+</button>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted">Balans</span><span className="font-semibold">{balance}</span></div>
              <div className="flex justify-between"><span className="text-muted">Ümumi</span><span className="font-semibold">− {total}</span></div>
              <div className={cx("flex justify-between border-t border-line pt-1.5 font-bold", total > balance && "text-bad")}>
                <span>Qalan</span><span>{balance - total}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
