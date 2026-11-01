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
  exact?: boolean;
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
    { href: "/admin", key: "dashboard", icon: "chart", match: ["/admin"], exact: true },
    { href: "/admin/users", key: "users", icon: "users", match: ["/admin/users"] },
    { href: "/admin/content", key: "content", icon: "file", match: ["/admin/content"] },
    { href: "/admin/pins", key: "pins", icon: "pin", match: ["/admin/pins"] },
    { href: "/admin/deleted", key: "deleted", icon: "trash", match: ["/admin/deleted"] },
    { href: "/admin/site", key: "site", icon: "globe", match: ["/admin/site"] },
  ],
};

const HOME: Record<User["role"], string> = { STUDENT: "/student", TEACHER: "/teacher", ADMIN: "/admin" };

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand">
        <span className="h-3.5 w-3.5 rounded-full bg-white" />
      </span>
      <span className="hidden text-lg font-bold tracking-tight text-brand min-[420px]:inline">EduFlow</span>
    </span>
  );
}

/* ───── Axtarış ───── */
interface Hit { kind: string; id: string; title: string; sub: string; href: string; photo: string | null }

function Search({ t, className, wide, autoFocus, onDone }: { t: (k: DictKey) => string; className?: string; wide?: boolean; autoFocus?: boolean; onDone?: () => void }) {
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
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

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
    <div ref={box} className={cx("relative min-w-0 flex-1", className ?? "mx-auto max-w-xl")} role="search">
      <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          else if (e.key === "Enter" && hits.length) go(hits[sel < 0 ? 0 : sel]);
          else if (e.key === "Escape") { setOpen(false); input.current?.blur(); onDone?.(); }
        }}
        placeholder={t("search")}
        aria-label={t("search")}
        autoComplete="off"
        className="h-10 w-full rounded-md border border-line-strong bg-surface-2 pl-10 pr-10 text-sm font-medium text-ink placeholder:text-muted/80 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-iris/30"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong bg-white px-1.5 text-xs font-semibold text-muted sm:block">/</kbd>

      {open && q.trim().length >= 2 && (
        <div className={cx("pop-menu pop-search max-h-[70vh] overflow-y-auto p-1.5", wide ? "right-0 w-[26rem] max-w-[calc(100vw-2rem)]" : "left-0 right-0")}>
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
                    className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition", sel === i ? "bg-tint" : "hover:bg-tint/60")}
                  >
                    {h.kind === "people" ? (
                      <Avatar src={h.photo} name={h.title} size={32} />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-brand">
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

/* ───── Üst panelin ikon düymələri ───── */
function IconBtn({
  icon, label, open, onClick, dot, children, href,
}: {
  icon?: IconName;
  label: string;
  open?: boolean;
  onClick?: () => void;
  dot?: boolean;
  children?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      {children ?? (icon && <Icon name={icon} size={20} />)}
      {dot && <span className="nb-dot" />}
    </>
  );
  const cls = cx("ib", open && "open");
  return href ? (
    <Link href={href} className={cls} aria-label={label} title={label}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label} title={label} aria-expanded={open}>{inner}</button>
  );
}

interface Notice { id: string; text: string; href: string; at: string }

export default function AppShell({ role, children }: { role: ShellRole; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const [menu, setMenu] = useState<"lang" | "bell" | "coin" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // Bildirimlər: "son baxış" vaxtı brauzerdə saxlanılır; ondan yeni olanlar oxunmamış sayılır
  const [seenTick, setSeenTick] = useState(0);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
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
    // pointerdown: iPhone-da boş yerə toxunuş mousedown yaratmır, ona görə pəncərə bağlanmırdı
    const click = (e: PointerEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) {
        setMenu(null);
        if (bar.current.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      }
    };
    document.addEventListener("pointerdown", click);
    return () => document.removeEventListener("pointerdown", click);
  }, []);

  if (loading || !user || (role !== "ANY" && user.role !== role)) return <FullPageLoader />;

  const items = NAV[user.role];
  const isActive = (i: NavItem) =>
    i.match.some((m) => (i.exact ? pathname === m : pathname === m || pathname.startsWith(m + "/")));
  const onProfile = pathname === `/u/${user.id}`;
  const showCoin = user.role !== "ADMIN";
  const seenKey = `notif-seen:${user.id}`;
  let seen = 0;
  try {
    seen = seenTick >= 0 ? Number(localStorage.getItem(seenKey) ?? 0) : 0;
  } catch { /* brauzer yaddaşı bağlıdırsa hamısı oxunmamış sayılır */ }
  const unread = notes.filter((n) => new Date(n.at).getTime() > seen);
  function markSeen() {
    const newest = Math.max(0, ...notes.map((n) => new Date(n.at).getTime()));
    try { localStorage.setItem(seenKey, String(newest)); } catch { /* ignore */ }
    setSeenTick((t) => t + 1);
  }

  return (
    <div className="min-h-screen">
      <header className="topbar">
        <div className="topbar-in" ref={bar}>
          <Link href={HOME[user.role]} aria-label="EduFlow" className="mr-3 shrink-0 lg:mr-6">
            <Logo />
          </Link>

          {/* Tək sıra menyu: ad həmişə görünür (yalnız geniş ekranda; telefonda alt panel) */}
          <nav className="hidden h-full items-stretch lg:flex" aria-label="Əsas menyu">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="tl" aria-current={isActive(i) ? "page" : undefined}>
                <Icon name={i.icon} size={19} />
                {t(i.key)}
                {i.dot === "requests" && pending > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{pending}</span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="hidden w-60 min-w-0 xl:block"><Search t={t} className="w-full" wide /></div>

          <div className="flex items-center gap-1">
            <button type="button" className="ib hidden md:grid xl:hidden" aria-label={t("search")} title={t("search")} onClick={() => setSearchOpen(true)}>
              <Icon name="search" size={20} />
            </button>

            <div className="relative">
              <IconBtn icon="globe" label={`${t("language")} · ${lang}`} open={menu === "lang"} onClick={() => setMenu(menu === "lang" ? null : "lang")} />
              {menu === "lang" && (
                <div className="pop-menu right-0 w-52 p-1.5" role="menu">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      role="menuitemradio"
                      aria-checked={lang === l.code}
                      onClick={() => { setLang(l.code); setMenu(null); }}
                      className={cx("flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition", lang === l.code ? "bg-tint text-brand" : "hover:bg-tint/60")}
                    >
                      {l.label}<span className="text-muted">{l.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <IconBtn icon="bell" label={t("notifications")} open={menu === "bell"} dot={unread.length > 0} onClick={() => {
                if (menu === "bell") { setMenu(null); return; }
                setFresh(new Set(unread.map((n) => n.id)));
                setMenu("bell");
                loadNotes();
                markSeen();
              }} />
              {menu === "bell" && (
                <div className="pop-menu -right-16 w-[min(22rem,calc(100vw-1.5rem))] sm:right-0">
                  <p className="border-b border-line px-4 py-3 text-sm font-bold">{t("notifications")}</p>
                  <div className="max-h-96 overflow-y-auto">
                    {notes.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">{t("noNotifications")}</p>}
                    {notes.map((n) => (
                      <Link key={n.id} href={n.href} className={cx("block border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-tint/60", fresh.has(n.id) && "bg-tint")}>
                        <p className="text-sm font-medium">{n.text}</p>
                        <p className="mt-0.5 text-xs text-muted">{timeAgo(n.at)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showCoin && (
              <Link
                href={`/u/${user.id}?tab=coins`}
                aria-label={`${t("coin")}: ${user.coinBalance}`}
                title={t("coin")}
                className="mx-1 hidden h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-bold tabular-nums transition-colors hover:bg-tint sm:flex"
              >
                <span className="coin-ic !h-4 !w-4" /> {user.coinBalance.toLocaleString("az-AZ")}
              </Link>
            )}
            {showCoin && (
              <div className="relative sm:hidden">
                <IconBtn label={`${t("coin")}: ${user.coinBalance}`} open={menu === "coin"} onClick={() => setMenu(menu === "coin" ? null : "coin")}>
                  <span className="coin-ic" />
                </IconBtn>
                {menu === "coin" && (
                  <div className="pop-menu p-4" role="status">
                    <p className="text-xs font-bold text-muted">{t("coin")}</p>
                    <p className="mt-1 flex items-center gap-2 text-2xl font-extrabold tabular-nums">
                      <span className="coin-ic" /> {user.coinBalance.toLocaleString("az-AZ")} coin
                    </p>
                    <Link href={`/u/${user.id}?tab=coins`} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Tarixçə →</Link>
                  </div>
                )}
              </div>
            )}

            <Link
              href={`/u/${user.id}`}
              aria-label={t("profile")}
              aria-current={onProfile ? "page" : undefined}
              className={cx(
                "flex items-center gap-2 rounded-full border p-0.5 text-sm font-semibold transition-colors sm:pr-3",
                onProfile ? "border-brand bg-tint text-brand" : "border-line bg-white text-ink hover:bg-tint hover:text-brand",
              )}
            >
              <Avatar src={user.photo} name={user.name} size={30} className="border border-line" />
              <span className="hidden max-w-[130px] truncate sm:inline">{user.name}</span>
            </Link>

            <IconBtn icon="logout" label={t("logout")} onClick={logout} />
          </div>

          {/* Orta ekranlarda (md–xl) axtarış ikonla açılır və paneli örtür */}
          {searchOpen && (
            <div className="absolute inset-x-0 top-0 z-[70] hidden h-16 items-center gap-2 bg-white px-4 md:flex xl:hidden lg:px-8">
              <Search t={t} autoFocus onDone={() => setSearchOpen(false)} />
              <button type="button" className="ib" aria-label="Bağla" onClick={() => setSearchOpen(false)}><Icon name="x" size={20} /></button>
            </div>
          )}
        </div>
        <div className="border-t border-line px-4 pb-2.5 pt-2 md:hidden"><Search t={t} /></div>
      </header>

      <main className="relative z-10 min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Mobil alt naviqasiya */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cx(
              "relative my-1 flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition",
              isActive(i) ? "bg-tint text-brand after:absolute after:inset-x-3 after:top-0 after:h-[3px] after:rounded-b after:bg-accent" : "text-muted",
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
