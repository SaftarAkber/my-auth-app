"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { Field, Modal, Spinner, useToast } from "@/components/ui";

interface Enr {
  status: string;
  student: { id: string; name: string };
  group: { id: string; name: string };
}

/** Müəllim öz balansından tələbəyə coin hədiyyə edir. studentId/attemptId verilərsə əvvəlcədən seçilir. */
export default function GiftModal({
  open, onClose, onDone, studentId, studentName, attemptId, defaultAmount = 20, defaultReason = "",
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  studentId?: string;
  studentName?: string;
  attemptId?: string;
  defaultAmount?: number;
  defaultReason?: string;
}) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [who, setWho] = useState(studentId ?? "");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [reason, setReason] = useState(defaultReason);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWho(studentId ?? "");
    setAmount(String(defaultAmount));
    setReason(defaultReason);
    if (studentId) return;
    api<{ enrollments: Enr[] }>("/api/enrollment/my")
      .then((d) => {
        const m = new Map<string, string>();
        d.enrollments.filter((e) => e.status === "ACCEPTED").forEach((e) => m.set(e.student.id, e.student.name));
        setStudents([...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setStudents([]));
  }, [open, studentId, defaultAmount, defaultReason]);

  const balance = user?.coinBalance ?? 0;
  const n = Math.floor(Number(amount));
  const error = useMemo(() => {
    if (!who) return "Tələbə seçin";
    if (!Number.isFinite(n) || n < 1) return "Coin sayı ən az 1 olmalıdır";
    if (n > balance) return `Balansınız çatmır: ${balance} coin var`;
    return "";
  }, [who, n, balance]);

  async function send() {
    if (error) return toast.error(error);
    setBusy(true);
    try {
      await api("/api/coins/gift", { body: { studentId: who, amount: n, reason: reason.trim() || undefined, attemptId } });
      await refreshUser();
      toast.success(`${n} coin göndərildi`);
      onClose();
      onDone?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Coin hədiyyə et"
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={send} disabled={busy || !!error}>{busy ? <Spinner /> : "Göndər"}</button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">Balansınızdan tələbəyə coin göndərilir. Qalıb: <b className="text-ink tabular-nums">{balance}</b> coin.</p>
      <div className="grid gap-4">
        {studentId ? (
          <Field label="Tələbə"><div className="input bg-surface-2 font-semibold">{studentName ?? "Seçilmiş tələbə"}</div></Field>
        ) : (
          <Field label="Tələbə">
            <select className="input" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">Seçin…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Coin sayı" hint={error && who ? error : undefined}>
          <input className="input tabular-nums" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Səbəb (istəyə bağlı)">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Məsələn: Kvadrat tənliklər, 29/30" maxLength={200} />
        </Field>
      </div>
    </Modal>
  );
}
