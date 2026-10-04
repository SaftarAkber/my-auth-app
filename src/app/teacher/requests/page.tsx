"use client";

import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, Modal, PageHeader, SkeletonList, Spinner, Tabs, useToast } from "@/components/ui";

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  message: string | null;
  teacherReply: string | null;
  createdAt: string;
  student: { id: string; name: string; photo: string | null; email: string | null; phone: string | null };
  group: { id: string; name: string };
}

export default function TeacherRequestsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const [tab, setTab] = useState<"PENDING" | "ACCEPTED" | "DECLINED">("PENDING");
  const [reply, setReply] = useState<{ req: Enrollment; action: "ACCEPTED" | "DECLINED" } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const all = data?.enrollments ?? [];
  const list = all.filter((e) => e.status === tab);
  const count = (s: Enrollment["status"]) => all.filter((e) => e.status === s).length;

  async function submit() {
    if (!reply) return;
    setBusy(true);
    try {
      await api("/api/enrollment/respond", {
        body: { enrollmentId: reply.req.id, action: reply.action, teacherReply: text.trim() || undefined },
      });
      toast.success(reply.action === "ACCEPTED" ? "Tələbə qrupa əlavə edildi" : "Müraciət rədd edildi");
      setReply(null);
      setText("");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-narrow">
      <PageHeader title="Müraciətlər" subtitle="Qruplara qoşulmaq istəyən tələbələr" />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "PENDING", label: "Gözləyən", count: count("PENDING") },
          { id: "ACCEPTED", label: "Qəbul edilən", count: count("ACCEPTED") },
          { id: "DECLINED", label: "Rədd edilən", count: count("DECLINED") },
        ]}
      />

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty icon="inbox" title="Burada müraciət yoxdur" />
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <article key={e.id} className="card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Avatar src={e.student.photo} name={e.student.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{e.student.name}</p>
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-brand">{e.group.name}</span> · {timeAgo(e.createdAt)}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                    {e.student.phone && <span className="inline-flex items-center gap-1"><Icon name="phone" size={12} />{e.student.phone}</span>}
                    {e.student.email && <span className="inline-flex items-center gap-1"><Icon name="mail" size={12} />{e.student.email}</span>}
                  </p>
                </div>
              </div>
              {e.message && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">“{e.message}”</p>}
              {e.teacherReply && <p className="mt-2 rounded-xl bg-brand/5 p-3 text-sm"><span className="font-semibold text-brand">Cavabınız:</span> {e.teacherReply}</p>}

              {e.status === "PENDING" ? (
                <div className="mt-4 flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => { setReply({ req: e, action: "ACCEPTED" }); setText(""); }}><Icon name="check" size={14} /> Qəbul et</button>
                  <button className="btn-secondary btn-sm" onClick={() => { setReply({ req: e, action: "DECLINED" }); setText(""); }}><Icon name="x" size={14} /> Rədd et</button>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  {e.status === "DECLINED" && (
                    <button className="btn-soft btn-sm" onClick={() => { setReply({ req: e, action: "ACCEPTED" }); setText(""); }}>Yenə də qəbul et</button>
                  )}
                  {e.status === "ACCEPTED" && (
                    <button className="btn-ghost btn-sm hover:!text-bad" onClick={() => { setReply({ req: e, action: "DECLINED" }); setText(""); }}>Qrupdan çıxar</button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!reply}
        onClose={() => setReply(null)}
        title={reply?.action === "ACCEPTED" ? "Müraciəti qəbul et" : "Müraciəti rədd et"}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setReply(null)}>Ləğv et</button>
            <button className={reply?.action === "ACCEPTED" ? "btn-primary" : "btn-danger"} onClick={submit} disabled={busy}>
              {busy ? <Spinner /> : reply?.action === "ACCEPTED" ? "Qəbul et" : "Rədd et"}
            </button>
          </>
        }
      >
        <label className="block">
          <span className="label">Tələbəyə cavab (istəyə bağlı)</span>
          <textarea className="input min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder="Qısa mesaj yazın…" />
        </label>
      </Modal>
    </div>
  );
}
