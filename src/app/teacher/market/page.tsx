"use client";

import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx, fmtDateTime } from "@/lib/format";
import { ORDER_STATUS } from "@/components/content";
import {
  CoinPill, Empty, ErrorBox, Field, Icon, Img, ImageUpload, Modal, PageHeader, SkeletonList, Spinner, Tabs, Toggle,
  useConfirm, useToast,
} from "@/components/ui";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
}
interface Order {
  id: string;
  quantity: number;
  totalCost: number;
  status: keyof typeof ORDER_STATUS;
  createdAt: string;
  product: Product;
  user: { id: string; name: string; phone: string | null; email: string | null };
}

const BLANK = { name: "", description: "", price: "", stock: "", imageUrl: null as string | null, isActive: true };

export default function TeacherMarketPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const products = useFetch<{ products: Product[] }>("/api/products?all=1");
  const orders = useFetch<{ orders: Order[] }>("/api/orders");
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const orderList = orders.data?.orders ?? [];
  const pendingCount = orderList.filter((o) => o.status === "PENDING").length;

  function open(p: Product | "new") {
    setEditing(p);
    setForm(p === "new" ? BLANK : { name: p.name, description: p.description ?? "", price: String(p.price), stock: String(p.stock), imageUrl: p.imageUrl, isActive: p.isActive });
  }

  async function save() {
    const price = Number(form.price);
    const stock = Number(form.stock || 0);
    if (!form.name.trim()) return toast.error("Ad məcburidir");
    if (!Number.isInteger(price) || price <= 0) return toast.error("Qiymət müsbət tam ədəd olmalıdır");
    if (!Number.isInteger(stock) || stock < 0) return toast.error("Stok mənfi ola bilməz");
    setBusy(true);
    try {
      const body = { name: form.name.trim(), description: form.description, price, stock, imageUrl: form.imageUrl ?? "", isActive: form.isActive };
      if (editing === "new") await api("/api/products", { body });
      else if (editing) await api(`/api/products/${editing.id}`, { method: "PATCH", body });
      toast.success("Yadda saxlanıldı");
      setEditing(null);
      products.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Product) {
    if (!(await confirm({ title: `“${p.name}” silinsin?`, message: "Sifarişi olan məhsullar silinmir, yalnız deaktiv olunur.", confirmText: "Sil", danger: true }))) return;
    try {
      const r = await api<{ message: string }>(`/api/products/${p.id}`, { method: "DELETE" });
      toast.info(r.message);
      products.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function setStatus(o: Order, status: Order["status"]) {
    if (status === "REJECTED") {
      const ok = await confirm({
        title: "Sifariş rədd edilsin?",
        message: `${o.totalCost} coin tələbəyə qaytarılacaq və stok bərpa olunacaq.`,
        confirmText: "Rədd et",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await api(`/api/orders/${o.id}`, { method: "PATCH", body: { status } });
      toast.success("Status yeniləndi");
      orders.reload();
      products.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Market"
        subtitle="Məhsulları idarə edin, tələbə sifarişlərini təsdiqləyin"
        actions={tab === "products" && <button className="btn-primary" onClick={() => open("new")}><Icon name="plus" size={16} /> Yeni məhsul</button>}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "orders", label: "Sifarişlər", count: pendingCount || undefined },
          { id: "products", label: "Məhsullar", count: products.data?.products.length },
        ]}
      />

      {tab === "orders" ? (
        orders.loading ? (
          <SkeletonList />
        ) : orders.error ? (
          <ErrorBox message={orders.error} onRetry={orders.reload} />
        ) : orderList.length === 0 ? (
          <Empty icon="inbox" title="Hələ sifariş yoxdur" />
        ) : (
          <div className="space-y-3">
            {orderList.map((o) => (
              <article key={o.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 text-muted">
                    {o.product.imageUrl ? <Img src={o.product.imageUrl} className="h-full w-full object-cover" /> : <Icon name="bag" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{o.product.name} <span className="text-muted">× {o.quantity}</span></p>
                    <p className="truncate text-sm text-muted">{o.user.name} · {o.user.phone ?? o.user.email ?? "—"}</p>
                    <p className="text-xs text-muted">{fmtDateTime(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <CoinPill amount={o.totalCost} />
                    <p className="mt-1.5"><span className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</span></p>
                  </div>
                </div>
                {(o.status === "PENDING" || o.status === "APPROVED") && (
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                    {o.status === "PENDING" && <button className="btn-primary btn-sm" onClick={() => setStatus(o, "APPROVED")}><Icon name="check" size={14} /> Təsdiqlə</button>}
                    {o.status === "APPROVED" && <button className="btn-primary btn-sm" onClick={() => setStatus(o, "DELIVERED")}><Icon name="check" size={14} /> Təhvil verildi</button>}
                    <button className="btn-secondary btn-sm hover:!text-bad" onClick={() => setStatus(o, "REJECTED")}><Icon name="x" size={14} /> Rədd et</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )
      ) : products.loading ? (
        <SkeletonList rows={3} className="h-24" />
      ) : (products.data?.products ?? []).length === 0 ? (
        <Empty icon="bag" title="Hələ məhsul yoxdur" action={<button className="btn-primary" onClick={() => open("new")}>Məhsul əlavə et</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.data!.products.map((p) => (
            <article key={p.id} className={cx("card overflow-hidden", !p.isActive && "opacity-60")}>
              <div className="aspect-[16/9] bg-surface-2">
                {p.imageUrl ? <Img src={p.imageUrl} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-muted"><Icon name="bag" size={34} /></span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{p.name}</h3>
                  {!p.isActive && <span className="badge-muted">Deaktiv</span>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <CoinPill amount={p.price} />
                  <span className={cx("text-xs font-semibold", p.stock === 0 ? "text-bad" : "text-muted")}>Stok: {p.stock}</span>
                </div>
                <div className="mt-3 flex gap-1 border-t border-line pt-3">
                  <button className="btn-secondary btn-sm flex-1" onClick={() => open(p)}><Icon name="edit" size={14} /> Redaktə</button>
                  <button className="btn-icon hover:!text-bad" onClick={() => remove(p)}><Icon name="trash" size={17} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yeni məhsul" : "Məhsulu redaktə et"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <ImageUpload label="Şəkil" value={form.imageUrl} onChange={(u) => setForm({ ...form, imageUrl: u })} />
          <Field label="Ad *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Təsvir"><textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Qiymət (coin) *"><input className="input" type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Stok"><input className="input" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
          </div>
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Satışda" hint="Deaktiv məhsullar tələbələrə görünmür" />
        </div>
      </Modal>
    </div>
  );
}
