"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/api";
import { cx, fmtDate, fmtDateTime, percent, timeAgo } from "@/lib/format";
import { ProfileEditor } from "@/components/settings";
import { Avatar, CoinPill, Empty, Icon, PageHeader, SkeletonList, StatCard, Tabs } from "@/components/ui";

interface Tx {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  createdAt: string;
}
interface Attempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  finishedAt: string | null;
  package: { name: string };
}
interface Entry {
  rank: number;
  student: { id: string; name: string; photo: string | null };
  coins: number;
  isMe: boolean;
}

const TX_LABEL: Record<string, string> = {
  INITIAL_GRANT: "Başlanğıc bonus",
  TEST_CREATED: "Test yaradıldı",
  CORRECT_ANSWER: "Düzgün cavablar",
  RANK_REWARD: "Reytinq mükafatı",
  PURCHASE: "Alış-veriş",
  ADMIN_ADJUST: "Düzəliş",
};

export default function StudentProfilePage() {
  const { user } = useAuth();
  const coins = useFetch<{ balance: number; transactions: Tx[] }>("/api/coins");
  const attempts = useFetch<Attempt[]>("/api/attempts");
  const board = useFetch<{ entries: Entry[] }>("/api/leaderboard");
  const [tab, setTab] = useState<"coins" | "results" | "board">("coins");
  const [edit, setEdit] = useState(false);

  if (!user) return null;
  const done = (attempts.data ?? []).filter((a) => a.finishedAt);
  const avg = done.length ? Math.round(done.reduce((s, a) => s + percent(a.score, a.totalScore), 0) / done.length) : 0;
  const best = done.reduce((m, a) => Math.max(m, percent(a.score, a.totalScore)), 0);

  return (
    <div className="page-narrow">
      <PageHeader title="Profilim" />

      <section className="card flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <Avatar src={user.photo} name={user.name} size={84} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-extrabold tracking-tight">{user.name}</h2>
          <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-muted">
            {user.phone && <span className="inline-flex items-center gap-1.5"><Icon name="phone" size={14} />{user.phone}</span>}
            {user.email && <span className="inline-flex items-center gap-1.5"><Icon name="mail" size={14} />{user.email}</span>}
          </p>
          <p className="mt-2 text-sm">{user.bio || <span className="text-muted">Haqqınızda qısa məlumat əlavə edin.</span>}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={14} /> Redaktə et</button>
      </section>
      {edit && <ProfileEditor open onClose={() => setEdit(false)} />}

      <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Coin" value={user.coinBalance} icon="coin" tone="warn" />
        <StatCard label="Test sayı" value={done.length} icon="file" />
        <StatCard label="Orta nəticə" value={`${avg}%`} icon="chart" tone="info" />
        <StatCard label="Ən yaxşı" value={`${best}%`} icon="award" tone="ok" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "coins", label: "Coin tarixçəsi" },
          { id: "results", label: "Nəticələr", count: done.length },
          { id: "board", label: "Reytinq" },
        ]}
      />

      {tab === "coins" &&
        (coins.loading ? (
          <SkeletonList />
        ) : (coins.data?.transactions ?? []).length === 0 ? (
          <Empty icon="coin" title="Hələ coin əməliyyatı yoxdur" text="Testləri düzgün cavablandırdıqca coin qazanacaqsınız." />
        ) : (
          <div className="card divide-y divide-line">
            {coins.data!.transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", t.amount > 0 ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad")}>
                  <Icon name={t.amount > 0 ? "plus" : "bag"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{TX_LABEL[t.type] ?? t.type}</p>
                  <p className="truncate text-xs text-muted">{t.reason ?? "—"} · {timeAgo(t.createdAt)}</p>
                </div>
                <span className={cx("font-bold", t.amount > 0 ? "text-ok" : "text-bad")}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
              </div>
            ))}
          </div>
        ))}

      {tab === "results" &&
        (done.length === 0 ? (
          <Empty icon="file" title="Hələ tamamlanmış test yoxdur" />
        ) : (
          <div className="card divide-y divide-line">
            {done.map((a) => {
              const p = percent(a.score, a.totalScore);
              return (
                <Link key={a.id} href={`/student/attempts/${a.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.package.name}</p>
                    <p className="text-xs text-muted">{fmtDateTime(a.finishedAt)}</p>
                  </div>
                  <span className="text-sm text-muted">{a.score}/{a.totalScore}</span>
                  <span className={cx("badge", p >= 70 ? "bg-ok/10 text-ok" : p >= 40 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad")}>{p}%</span>
                </Link>
              );
            })}
          </div>
        ))}

      {tab === "board" &&
        (board.loading ? (
          <SkeletonList />
        ) : (
          <div className="card divide-y divide-line">
            {(board.data?.entries ?? []).map((e) => (
              <div key={e.student.id} className={cx("flex items-center gap-3 px-4 py-3", e.isMe && "bg-brand/5")}>
                <span className={cx("w-7 text-center font-extrabold", e.rank <= 3 ? "text-warn" : "text-muted")}>{e.rank}</span>
                <Avatar src={e.student.photo} name={e.student.name} size={36} />
                <span className="min-w-0 flex-1 truncate font-semibold">{e.student.name}{e.isMe && " (siz)"}</span>
                <CoinPill amount={e.coins} />
              </div>
            ))}
            {(board.data?.entries ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted">Reytinq boşdur.</p>}
          </div>
        ))}

      <p className="mt-6 text-center text-xs text-muted">Qeydiyyat tarixi: {fmtDate(user.createdAt)}</p>
    </div>
  );
}
