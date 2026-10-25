"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, type User } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cx, timeAgo } from "@/lib/format";
import { LANGS, useLang, type DictKey } from "@/lib/i18n";
import { Avatar, FullPageLoader, Icon, type IconName } from "@/components/ui";

type ShellRole = "STUDENT" | "TEACHER" | "ADMIN" | "ANY";

interface NavItem {
  href: string;
  key: DictKey;
  icon: IconName;
  match: string[];
  dot?: "requests";
}

const NAV: Record<"STUDENT" | "TEACHER" | "ADMIN", NavItem[]> = {
  STUDENT: [
    { href: "/student/teacher", key: "groups", icon: "users", match: ["/student/teacher", "/student/groups"] },
    { href: "/student/my-tests", key: "tests", icon: "file", match: ["/student/my-tests", "/student/attempts"] },
    { href: "/student/videos", key: "videos", icon: "video", match: ["/student/videos"] },
    { href: "/student/market", key: "shop", icon: "bag", match: ["/student/market"] },
  ],
  TEACHER: [
    { href: "/teacher/groups", key: "groups", icon: "users", match: ["/teacher/groups"] },
    { href: "/teacher/tests", key: "tests", icon: "file", match: ["/teacher/tests", "/teacher/attempts"] },
    { href: "/teacher/lessons", key: "videos", icon: "video", match: ["/teacher/lessons"] },
    { href: "/teacher/students", key: "students", icon: "grad", match: ["/teacher/students", "/teacher/requests"], dot: "requests" },
    { href: "/teacher/market", key: "shop", icon: "bag", match: ["/teacher/market"] },
  ],
  ADMIN: [
    { href: "/admin", key: "users", icon: "users", match: ["/admin/users", "/admin"] },
    { href: "/admin/content", key: "content", icon: "file", match: ["/admin/content"] },
    { href: "/admin/site", key: "site", icon: "globe", match: ["/admin/site"] },
  ],
};

const HOME: Record<User["role"], string> = { STUDENT: "/student", TEACHER: "/teacher", ADMIN: "/admin" };

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-ink bg-white">
        <span className="h-3.5 w-3.5 rounded-full bg-ink" />
      </span>
      <span className="hidden text-lg font-extrabold tracking-tight text-ink sm:inline">EduFlow</span>
    </span>
  );
}

function hw(label: string) {
  return Math.round(label.length * 8.6 + 68);
}

/* ───── Axtarış ───── */
interface Hit { kind: string; id: string; title: string; sub: string; href: string; photo: string | null }

function Search({ t }: { t: (k: DictKey) => string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const d = await res.json();
        setHits(res.ok ? d.results : []);
        setSel(-1);
      } catch {
        /* ləğv və ya şəbəkə xətası */
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    setQ("");
  }, [pathname]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement)?.tagName ?? "")) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(h.href);
  };

  const groups = hits.reduce<Record<string, Hit[]>>((m, h) => ((m[h.kind] ??= []).push(h), m), {});
  const LABEL: Record<string, string> = {
    people: t("people"), groups: t("groups"), tests: t("tests"), videos: t("videos"), posts: "Paylaşımlar",
  };

  return (
    <div ref={box} className="relative mx-auto min-w-0 max-w-xl flex-1" role="search">
      <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink" />
      <input
        ref={input}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          else if (e.key === "Enter" && hits.length) go(hits[sel < 0 ? 0 : sel]);
          else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
        }}
        placeholder={t("search")}
        aria-label={t("search")}
        autoComplete="off"
        className="h-10 w-full rounded-full border-[2.5px] border-ink bg-white pl-10 pr-10 text-sm font-medium text-ink placeholder:text-muted/80 focus:outline-none"
        style={{ boxShadow: open ? "4px 4px 0 rgb(var(--ink))" : undefined }}
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border-2 border-ink bg-sun px-1.5 text-xs font-semibold sm:block">/</kbd>

      {open && q.trim().length >= 2 && (
        <div className="pop-menu left-0 right-0 max-h-[70vh] overflow-y-auto p-1.5">
          {busy && hits.length === 0 && <p className="px-3 py-4 text-sm text-muted">…</p>}
          {!busy && hits.length === 0 && <p className="px-3 py-4 text-sm text-muted">{t("searchNone")}</p>}
          {Object.entries(groups).map(([kind, list]) => (
            <div key={kind}>
              <p className="px-3 pb-1 pt-2 text-xs font-bold text-muted">{LABEL[kind] ?? kind}</p>
              {list.map((h) => {
                const i = hits.indexOf(h);
                return (
                  <button
                    key={`${h.kind}${h.id}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                    className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition", sel === i ? "bg-sun" : "hover:bg-sun/40")}
                  >
                    {h.kind === "people" ? (
                      <Avatar src={h.photo} name={h.title} size={32} />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-iris/40">
                        <Icon name={h.kind === "groups" ? "users" : h.kind === "tests" ? "file" : h.kind === "videos" ? "video" : "message"} size={15} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{h.title}</span>
                      <span className="block truncate text-xs text-muted">{h.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Naviqasiya düyməsi (sağdan-sola açılan) ───── */
function RightBtn({
  icon, label, width = 40, hover, open, onClick, dot, children, href, ariaLabel,
}: {
  icon?: IconName;
  label: string;
  width?: number;
  hover: number;
  open?: boolean;
  onClick?: () => void;
  dot?: boolean;
  children?: React.ReactNode;
  href?: string;
  ariaLabel?: string;
}) {
  const inner = (
    <span className="bx">
      <span className="ic">
        {children ?? (icon && <Icon name={icon} size={20} />)}
        {dot && <span className="nb-dot" />}
      </span>
      <span className="lab">{label}</span>
    </span>
  );
  const style = { "--w": `${width}px`, "--hw": `${hover}px` } as React.CSSProperties;
  const cls = cx("nb r", open && "open");
  return href ? (
    <Link href={href} className={cls} style={style} aria-label={ariaLabel ?? label}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} style={style} aria-label={ariaLabel ?? label} aria-expanded={open}>{inner}</button>
  );
}

interface Notice { id: string; text: string; href: string; at: string }

export default function AppShell({ role, children }: { role: ShellRole; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const [menu, setMenu] = useState<"lang" | "bell" | null>(null);
  const [pending, setPending] = useState(0);
  const [notes, setNotes] = useState<Notice[]>([]);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (role !== "ANY" && user.role !== role) router.replace(HOME[user.role]);
  }, [user, loading, role, router]);

  // Bildirimlər (60 san-dən bir və səhifə dəyişəndə)
  const loadNotes = useCallback(() => {
    api<{ items: Notice[] }>("/api/notifications").then((d) => setNotes(d.items)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) return;
    loadNotes();
    const id = setInterval(loadNotes, 60_000);
    return () => clearInterval(id);
  }, [user, pathname, loadNotes]);

  useEffect(() => {
    if (user?.role !== "TEACHER") return;
    api<{ count: number }>("/api/teacher/requests/count").then((d) => setPending(d.count)).catch(() => {});
  }, [user, pathname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenu(null);
  }, [pathname]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  if (loading || !user || (role !== "ANY" && user.role !== role)) return <FullPageLoader />;

  const items = NAV[user.role];
  const isActive = (i: NavItem) =>
    i.match.some((m) => (m === "/admin" ? pathname === "/admin" : pathname === m || pathname.startsWith(m + "/")));
  const onProfile = pathname === `/u/${user.id}`;
  const showCoin = user.role !== "ADMIN";

  return (
    <div className="min-h-screen">
      <header className="topbar">
        <div className="topbar-in" ref={bar}>
          <Link href={HOME[user.role]} aria-label="EduFlow" className="mr-3 shrink-0 lg:mr-6">
            <Logo />
          </Link>

          {/* Sol: soldan sağa açılan ikonlar (yalnız geniş ekranda) */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Əsas menyu">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="nb l"
                aria-current={isActive(i) ? "page" : undefined}
                aria-label={t(i.key)}
                style={{ "--hw": `${hw(t(i.key))}px` } as React.CSSProperties}
              >
                <span className="bx">
                  <span className="ic">
                    <Icon name={i.icon} size={20} />
                    {i.dot === "requests" && pending > 0 && <span className="nb-dot" />}
                  </span>
                  <span className="lab">{t(i.key)}</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="mx-2 hidden min-w-0 flex-1 md:flex lg:mx-4"><Search t={t} /></div>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <div className="relative">
              <RightBtn icon="globe" label={`${t("language")} · ${lang}`} hover={hw(`${t("language")} · ${lang}`)} open={menu === "lang"} onClick={() => setMenu(menu === "lang" ? null : "lang")} />
              {menu === "lang" && (
                <div className="pop-menu right-0 w-52 p-1.5" role="menu">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      role="menuitemradio"
                      aria-checked={lang === l.code}
                      onClick={() => { setLang(l.code); setMenu(null); }}
                      className={cx("flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition", lang === l.code ? "bg-sun" : "hover:bg-sun/40")}
                    >
                      {l.label}<span className="text-muted">{l.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <RightBtn icon="bell" label={t("notifications")} hover={hw(t("notifications"))} open={menu === "bell"} dot={notes.length > 0} onClick={() => { setMenu(menu === "bell" ? null : "bell"); loadNotes(); }} />
              {menu === "bell" && (
                <div className="pop-menu -right-16 w-[min(22rem,calc(100vw-1.5rem))] sm:right-0">
                  <p className="border-b-2 border-ink px-4 py-3 text-sm font-bold">{t("notifications")}</p>
                  <div className="max-h-96 overflow-y-auto">
                    {notes.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">{t("noNotifications")}</p>}
                    {notes.map((n) => (
                      <Link key={n.id} href={n.href} className="block border-b border-line px-4 py-3 transition last:border-0 hover:bg-sun/30">
                        <p className="text-sm font-medium">{n.text}</p>
                        <p className="mt-0.5 text-xs text-muted">{timeAgo(n.at)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showCoin && (
              <RightBtn href={`/u/${user.id}`} label={t("coin")} width={Math.max(76, 52 + String(user.coinBalance).length * 10)} hover={hw(t("coin")) + 40} ariaLabel={`${t("coin")}: ${user.coinBalance}`}>
                <span className="coin-ic" />
              </RightBtn>
            )}
            {showCoin && <span className="-ml-1 mr-1 hidden text-sm font-extrabold tabular-nums sm:inline" aria-hidden>{user.coinBalance.toLocaleString("az-AZ")}</span>}

            <span className="mx-1 hidden h-6 w-0.5 bg-ink sm:block" />

            <Link
              href={`/u/${user.id}`}
              aria-label={t("profile")}
              aria-current={onProfile ? "page" : undefined}
              className={cx(
                "flex items-center gap-2 rounded-full border-[2.5px] border-ink py-0.5 pl-0.5 pr-3 text-sm font-semibold transition",
                onProfile ? "bg-ink text-white" : "bg-white hover:bg-ink hover:text-white",
              )}
            >
              <Avatar src={user.photo} name={user.name} size={30} className="border-2 border-ink" />
              <span className="hidden max-w-[130px] truncate sm:inline">{user.name}</span>
            </Link>

            <RightBtn icon="logout" label={t("logout")} hover={hw(t("logout"))} onClick={logout} />
          </div>
        </div>
        <div className="border-t-2 border-ink/20 px-4 pb-2.5 pt-2 md:hidden"><Search t={t} /></div>
      </header>

      <main className="relative z-10 min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Mobil alt naviqasiya */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t-[3px] border-ink bg-sun px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cx(
              "relative my-1 flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition",
              isActive(i) ? "bg-ink text-white" : "text-ink",
            )}
          >
            <Icon name={i.icon} size={20} />
            {t(i.key)}
            {i.dot === "requests" && pending > 0 && <span className="nb-dot !right-[28%] !top-1" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}
