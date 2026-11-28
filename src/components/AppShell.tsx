"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, type User } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cx, timeAgo } from "@/lib/format";
import { LANGS, useLang, type DictKey } from "@/lib/i18n";
import { Avatar, FullPageLoader, Icon, type IconName } from "@/components/ui";
import { BRAND, LogoMark } from "@/components/Logo";
import { Flag } from "@/components/Flags";

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
    { href: "/student/teacher", key: "groups", icon: "users", match: ["/student/teacher", "/student/teachers", "/student/groups"] },
    { href: "/student/my-tests", key: "tests", icon: "file", match: ["/student/my-tests", "/student/attempts"] },
    { href: "/student/assignments", key: "tasks", icon: "check", match: ["/student/assignments"] },
    { href: "/student/videos", key: "videos", icon: "video", match: ["/student/videos"] },
    { href: "/student/market", key: "shop", icon: "bag", match: ["/student/market"] },
  ],
  TEACHER: [
    { href: "/teacher/groups", key: "groups", icon: "users", match: ["/teacher/groups"] },
    { href: "/teacher/topics", key: "topics", icon: "book", match: ["/teacher/topics"] },
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
    { href: "/admin/carousel", key: "carousel", icon: "image", match: ["/admin/carousel"] },
    { href: "/admin/deleted", key: "deleted", icon: "trash", match: ["/admin/deleted"] },
    { href: "/admin/site", key: "site", icon: "globe", match: ["/admin/site"] },
  ],
};

const HOME: Record<User["role"], string> = { STUDENT: "/student", TEACHER: "/teacher", ADMIN: "/admin" };

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={36} />
      <span className="hidden text-lg font-extrabold tracking-tight text-brand min-[420px]:inline lg:hidden xl:inline">{BRAND}</span>
    </span>
  );
}

/* ───── Axtarış: panelin ortasından aşağı asılan, kənarları dalğa ilə panelə qovuşan blok ───── */
export interface Hit { kind: string; id: string; title: string; sub: string; href: string; photo: string | null }

const RECENT_KEY = "eduflow-recent-search";
function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5); } catch { return []; }
}
export function saveRecent(q: string) {
  const v = q.trim();
  if (v.length < 2) return;
  try {
    const rest = readRecent().filter((x) => x.toLocaleLowerCase("az") !== v.toLocaleLowerCase("az"));
    localStorage.setItem(RECENT_KEY, JSON.stringify([v, ...rest].slice(0, 5)));
  } catch { /* ignore */ }
}

/** Axtarılan hərfləri yaşıl işarələyir */
export function Mark({ text, q }: { text: string; q: string }) {
  const t = q.trim().toLocaleLowerCase("az");
  const i = t ? text.toLocaleLowerCase("az").indexOf(t) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-tint px-px text-brand-hover">{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

export const HIT_ICON: Record<string, IconName> = { groups: "users", tests: "file", videos: "video", posts: "news", people: "user" };

function Wing({ side }: { side: "l" | "r" }) {
  return (
    <svg className={cx("search-wing", side === "r" && "-scale-x-100")} viewBox="0 0 64 42" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,0 C32,0 32,42 64,42 L64,0 Z" fill="rgb(var(--surface) / 0.86)" />
      <path d="M0,0.5 C32,0.5 32,41.5 64,41.5" fill="none" stroke="rgb(var(--line))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Search({ t }: { t: (k: DictKey) => string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const ready = q.trim().length >= 2;

  useEffect(() => {
    if (!ready) {
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
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, ready]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    setQ("");
  }, [pathname]);

  useEffect(() => {
    const click = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = /INPUT|TEXTAREA|SELECT/.test(el?.tagName ?? "") || !!el?.isContentEditable;
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const go = (h: Hit) => {
    saveRecent(q);
    setOpen(false);
    setQ("");
    router.push(h.href);
  };
  const all = () => {
    saveRecent(q);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const groups = hits.reduce<Record<string, Hit[]>>((m, h) => ((m[h.kind] ??= []).push(h), m), {});
  const LABEL: Record<string, string> = {
    people: t("people"), groups: t("groups"), tests: t("tests"), videos: t("videos"), posts: "Paylaşımlar",
  };
  const showRecent = open && !ready && recent.length > 0;

  return (
    <div ref={box} className="search-tab" role="search">
      <Wing side="l" />
      <div className="search-body">
        <div className="search-pill">
          <Icon name="search" size={15} className="shrink-0 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => { setRecent(readRecent()); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter" && ready) { if (sel >= 0 && hits[sel]) go(hits[sel]); else all(); }
              else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
            }}
            placeholder={t("search")}
            aria-label={t("search")}
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-semibold text-ink placeholder:font-medium placeholder:text-muted/80 focus:outline-none focus:ring-0"
          />
          {q ? (
            <button
              type="button"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
              aria-label="Təmizlə"
              onClick={() => { setQ(""); input.current?.focus(); }}
            >
              <Icon name="x" size={14} stroke={2.4} />
            </button>
          ) : (
            <kbd className="pointer-events-none hidden shrink-0 rounded-md border border-line-strong bg-surface px-1.5 text-[10px] font-bold text-muted lg:block">Ctrl K</kbd>
          )}
        </div>
      </div>
      <Wing side="r" />

      {(showRecent || (open && ready)) && (
        <div className="search-pop animate-slide-in">
          <div className="search-scroll">
            {showRecent && (
              <>
                <p className="search-gh">Son axtarışlar</p>
                {recent.map((r) => (
                  <button key={r} type="button" className="search-item" onClick={() => { setQ(r); input.current?.focus(); }}>
                    <span className="search-ic"><Icon name="clock" size={13} /></span>
                    <span className="truncate text-[13px] font-semibold">{r}</span>
                  </button>
                ))}
              </>
            )}
            {ready && busy && hits.length === 0 && <p className="px-3 py-3 text-[13px] text-muted">…</p>}
            {ready && !busy && hits.length === 0 && <p className="px-3 py-3 text-[13px] text-muted">{t("searchNone")}</p>}
            {ready && Object.entries(groups).map(([kind, list]) => (
              <div key={kind}>
                <p className="search-gh">{LABEL[kind] ?? kind}</p>
                {list.map((h) => {
                  const i = hits.indexOf(h);
                  return (
                    <button
                      key={`${h.kind}${h.id}`}
                      type="button"
                      onMouseEnter={() => setSel(i)}
                      onClick={() => go(h)}
                      className={cx("search-item", sel === i && "bg-surface-2")}
                    >
                      {h.kind === "people" ? (
                        <Avatar src={h.photo} name={h.title} size={26} />
                      ) : (
                        <span className="search-ic"><Icon name={HIT_ICON[h.kind] ?? "file"} size={13} /></span>
                      )}
                      <span className="min-w-0 text-left">
                        <span className="block truncate text-[13px] font-semibold"><Mark text={h.title} q={q} /></span>
                        <span className="block truncate text-[11px] text-muted">{h.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {ready && hits.length > 0 && (
            <button
              type="button"
              onClick={all}
              className="mt-1 w-full border-t border-line px-3 pb-1.5 pt-2.5 text-center text-[13px] font-bold text-brand-hover hover:underline"
            >
              Bütün nəticələrə bax →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface Notice { id: string; text: string; href: string; at: string }

export default function AppShell({ role, children }: { role: ShellRole; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const [menu, setMenu] = useState<"lang" | "profile" | "notes" | null>(null);
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
  const homeItem: NavItem = { href: HOME[user.role], key: "home", icon: "home", match: [HOME[user.role]], exact: true };
  const mobileItems = user.role === "ADMIN" ? items : [homeItem, ...items];
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
      <header className="sticky top-0 z-50">
        <div className="topbar" ref={bar}><div className="topbar-in">
          <div className="flex min-w-0 flex-1 basis-0 items-center">
            <Link href={HOME[user.role]} aria-label="Tworing" className="shrink-0">
              <Logo />
            </Link>
          </div>

          {/* Tək sıra menyu: ad həmişə görünür (yalnız geniş ekranda; telefonda alt panel) */}
          <nav className="hidden shrink-0 items-center gap-0.5 lg:flex" aria-label="Əsas menyu">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="tl" title={t(i.key)} aria-current={isActive(i) ? "page" : undefined}>
                <Icon name={i.icon} size={19} />
                {/* Admin menyusu (7 bölmə) orta enlikdə yalnız ikon; tələbə və müəllimdə ad həmişə görünür */}
                <span className={user.role === "ADMIN" ? "max-xl:sr-only" : undefined}>{t(i.key)}</span>
                {i.dot === "requests" && pending > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{pending}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Sağda yalnız bayraq (dil) və profil; menyu ortada simmetrik qalsın deyə sol və sağ eyni en */}
          <div className="flex flex-1 basis-0 items-center justify-end gap-1">
            <div className="relative">
              <button
                type="button"
                className={cx("ib", menu === "lang" && "open")}
                aria-label={`${t("language")}: ${LANGS.find((l) => l.code === lang)?.label}`}
                title={t("language")}
                aria-expanded={menu === "lang"}
                onClick={() => setMenu(menu === "lang" ? null : "lang")}
              >
                <Flag code={lang} />
              </button>
              {menu === "lang" && (
                <div className="pop-menu right-0 w-52 p-1.5" role="menu">
                  {LANGS.filter((l) => l.code !== lang).map((l) => (
                    <button
                      key={l.code}
                      role="menuitem"
                      onClick={() => { setLang(l.code); setMenu(null); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition hover:bg-surface-2"
                    >
                      <Flag code={l.code} /> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label={t("profile")}
                aria-expanded={menu === "profile" || menu === "notes"}
                onClick={() => setMenu(menu === "profile" || menu === "notes" ? null : "profile")}
                className={cx(
                  "flex items-center gap-2 rounded-full border p-0.5 text-sm font-bold transition-colors xl:pr-2.5",
                  onProfile || menu === "profile" || menu === "notes" ? "border-brand/40 bg-tint text-brand" : "border-line bg-surface/70 text-ink hover:bg-surface",
                )}
              >
                <span className="relative">
                  <Avatar src={user.photo} name={user.name} size={30} className="border border-line" />
                  {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-bad" />}
                </span>
                <span className="hidden max-w-[130px] truncate xl:inline">{user.name}</span>
                <Icon name="down" size={14} className="hidden text-muted xl:block" />
              </button>

              {menu === "profile" && (
                <div className="pop-menu right-0 w-64 p-1.5" role="menu">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar src={user.photo} name={user.name} size={38} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold">{user.name}</span>
                      <span className="block text-xs text-muted">{user.role === "TEACHER" ? "Müəllim" : user.role === "ADMIN" ? "Admin" : "Tələbə"}</span>
                    </span>
                  </div>
                  <div className="mx-2 my-1 h-px bg-line" />
                  <Link href={`/u/${user.id}`} role="menuitem" className="pm-item"><Icon name="user" size={17} /> Profilə bax</Link>
                  {showCoin && (
                    <Link href={`/u/${user.id}?tab=coins`} role="menuitem" className="pm-item">
                      <Icon name="coin" size={17} /> Balansım
                      <span className="ml-auto flex items-center gap-1.5 tabular-nums text-muted"><span className="coin-ic !h-3.5 !w-3.5" />{user.coinBalance.toLocaleString("az-AZ")}</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="pm-item"
                    onClick={() => { setFresh(new Set(unread.map((n) => n.id))); setMenu("notes"); loadNotes(); markSeen(); }}
                  >
                    <Icon name="bell" size={17} /> {t("notifications")}
                    {unread.length > 0 && <span className="ml-auto rounded-full bg-bad px-2 text-xs font-bold text-white">{unread.length}</span>}
                  </button>
                  <div className="mx-2 my-1 h-px bg-line" />
                  <button type="button" role="menuitem" className="pm-item text-bad" onClick={logout}><Icon name="logout" size={17} /> {t("logout")}</button>
                </div>
              )}

              {menu === "notes" && (
                <div className="pop-menu right-0 w-[min(22rem,calc(100vw-1.5rem))]">
                  <div className="flex items-center gap-2 border-b border-line px-2 py-2">
                    <button type="button" className="btn-icon" aria-label="Geri" onClick={() => setMenu("profile")}><Icon name="left" size={17} /></button>
                    <p className="text-sm font-extrabold">{t("notifications")}</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notes.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">{t("noNotifications")}</p>}
                    {notes.map((n) => (
                      <Link key={n.id} href={n.href} onClick={() => setMenu(null)} className={cx("block border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-surface-2", fresh.has(n.id) && "bg-tint")}>
                        <p className="text-sm font-semibold">{n.text}</p>
                        <p className="mt-0.5 text-xs text-muted">{timeAgo(n.at)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div></div>
        {/* Axtarış: panelin ortasından aşağı asılır (bütün ekranlarda) */}
        <div className="pointer-events-none relative -mt-px flex justify-center">
          <Search t={t} />
        </div>
      </header>

      <main className="relative z-10 min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Telefonda alt menyu: kənarlardan aralı üzən hap, yalnız ikonlar; aktiv bölmə yaşıl dairə */}
      <nav className="bottom-pill lg:hidden" aria-label="Alt menyu">
        {mobileItems.map((i) => {
          const on = isActive(i);
          return (
            <Link key={i.href} href={i.href} aria-label={t(i.key)} title={t(i.key)} aria-current={on ? "page" : undefined} className={cx("bp-item", on && "on")}>
              <Icon name={i.icon} size={21} stroke={on ? 2.4 : 2} />
              {i.dot === "requests" && pending > 0 && <span className="nb-dot !right-1 !top-1" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
