"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, type User } from "@/context/AuthContext";
import { cx } from "@/lib/format";
import { api } from "@/lib/api";
import { Avatar, CoinPill, FullPageLoader, Icon, type IconName } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  badgeKey?: "requests";
  primary?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Ana səhifə", icon: "home", exact: true, primary: true },
  { href: "/student/teacher", label: "Müəllimlər", icon: "grad", primary: true },
  { href: "/student/my-tests", label: "Testlərim", icon: "file", primary: true },
  { href: "/student/market", label: "Market", icon: "bag", primary: true },
  { href: "/student/profil", label: "Profilim", icon: "user" },
  { href: "/student/settings", label: "Tənzimləmələr", icon: "settings" },
];

const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Panel", icon: "home", exact: true, primary: true },
  { href: "/teacher/groups", label: "Qruplar", icon: "users", primary: true },
  { href: "/teacher/tests", label: "Testlər", icon: "file", primary: true },
  { href: "/teacher/lessons", label: "Videodərslər", icon: "video" },
  { href: "/teacher/students", label: "Tələbələr", icon: "grad", primary: true },
  { href: "/teacher/requests", label: "Müraciətlər", icon: "inbox", badgeKey: "requests" },
  { href: "/teacher/attempts", label: "Nəticələr", icon: "chart" },
  { href: "/teacher/market", label: "Market", icon: "bag" },
  { href: "/teacher/profile", label: "Profilim", icon: "user" },
  { href: "/teacher/settings", label: "Tənzimləmələr", icon: "settings" },
];

function Brand({ role }: { role: User["role"] }) {
  return (
    <Link href={role === "TEACHER" ? "/teacher" : "/student"} className="flex items-center gap-2.5 px-1">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
        <Icon name="grad" size={20} />
      </span>
      <span className="text-lg font-extrabold tracking-tight">EduFlow</span>
    </Link>
  );
}

function NavLinks({
  items, pathname, pending, onNavigate,
}: { items: NavItem[]; pathname: string; pending: number; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        const badge = i.badgeKey === "requests" ? pending : 0;
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={onNavigate}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
              active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon name={i.icon} size={19} />
            <span className="flex-1">{i.label}</span>
            {badge > 0 && <span className="rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="space-y-3">
      <Link
        href={user.role === "TEACHER" ? "/teacher/profile" : "/student/profil"}
        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2"
      >
        <Avatar src={user.photo} name={user.name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="text-xs text-muted">{user.role === "TEACHER" ? "Müəllim" : "Tələbə"}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2">
        <CoinPill amount={user.coinBalance} />
        <button onClick={onLogout} className="btn-ghost btn-sm" title="Çıxış">
          <Icon name="logout" size={16} /> Çıxış
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ role, children }: { role: "STUDENT" | "TEACHER"; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [pending, setPending] = useState(0);

  const nav = role === "TEACHER" ? TEACHER_NAV : STUDENT_NAV;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(user.role === "TEACHER" ? "/teacher" : "/student");
  }, [user, loading, role, router]);

  // Müəllim üçün gözləyən müraciət sayı (səhifə dəyişəndə yenilənir)
  useEffect(() => {
    if (role !== "TEACHER" || !user) return;
    api<{ count: number }>("/api/teacher/requests/count")
      .then((d) => setPending(d.count))
      .catch(() => {});
  }, [role, user, pathname]);

  if (loading || !user || user.role !== role) return <FullPageLoader />;

  const primary = nav.filter((i) => i.primary);
  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));

  return (
    <div className="min-h-screen bg-bg lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-line bg-surface p-4 lg:flex">
        <div className="space-y-6 overflow-y-auto">
          <Brand role={role} />
          <NavLinks items={nav} pathname={pathname} pending={pending} />
        </div>
        <UserCard user={user} onLogout={logout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur lg:hidden">
          <Brand role={role} />
          <div className="flex items-center gap-2">
            <CoinPill amount={user.coinBalance} />
            <button className="btn-icon" onClick={() => setDrawer(true)} aria-label="Menyu">
              <Icon name="menu" size={22} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {primary.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cx(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition",
                isActive(i) ? "text-brand" : "text-muted",
              )}
            >
              <Icon name={i.icon} size={21} />
              {i.label}
            </Link>
          ))}
          <button
            onClick={() => setDrawer(true)}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted"
          >
            <Icon name="menu" size={21} /> Daha çox
            {pending > 0 && <span className="absolute right-[26%] top-1.5 h-2 w-2 rounded-full bg-bad" />}
          </button>
        </nav>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] animate-pop flex-col justify-between bg-surface p-4">
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between">
                <Brand role={role} />
                <button className="btn-icon" onClick={() => setDrawer(false)} aria-label="Bağla"><Icon name="x" /></button>
              </div>
              <NavLinks items={nav} pathname={pathname} pending={pending} onNavigate={() => setDrawer(false)} />
            </div>
            <UserCard user={user} onLogout={logout} />
          </aside>
        </div>
      )}
    </div>
  );
}
