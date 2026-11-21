"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { Icon, Spinner, useToast } from "@/components/ui";

/*
 * Telefon (PWA) bildirişləri — brauzer tərəfi.
 * Android/kompüter: birbaşa icazə istənir. iPhone (iOS 16.4+): əvvəl Safari-də "Ana ekrana əlavə et",
 * sonra ana ekrandakı EduFlow ikonundan açıb bildirişi aktiv etmək lazımdır.
 */

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function usePush() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const check = useCallback(async () => {
    try {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!KEY;
      if (!supported) return setState(isIOS() && !isStandalone() ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        // Abunəlik var: serverdə də olduğuna əmin oluruq (başqa hesabla girilmiş ola bilər)
        void api("/api/push/subscribe", { body: sub.toJSON() }).catch(() => null);
        return setState("on");
      }
      setState("off");
    } catch {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY) }));
      await api("/api/push/subscribe", { body: sub.toJSON() });
      setState("on");
      toast.success("Bildirişlər aktivdir");
    } catch (e) {
      toast.error(errMsg(e) || "Bildirişləri aktiv etmək olmadı");
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => null);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Bu cihazda bildirişlər bağlandı");
    } finally {
      setBusy(false);
    }
  }, [toast]);

  return { state, busy, enable, disable };
}

function IosSteps() {
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
      <li>Saytı <b className="text-ink">Safari</b>-də açın.</li>
      <li>Aşağıdakı <b className="text-ink">Paylaş</b> düyməsinə (kvadrat və yuxarı ox) toxunun.</li>
      <li><b className="text-ink">“Ana ekrana əlavə et”</b> seçin.</li>
      <li>Ana ekrandakı <b className="text-ink">EduFlow</b> ikonundan açın və burada bildirişi aktiv edin.</li>
    </ol>
  );
}

/** Tənzimləmələr: bu cihaz üçün bildirişləri aç / bağla */
export function PushCard() {
  const { state, busy, enable, disable } = usePush();
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="bell" size={18} /> Telefon bildirişləri</h2>
          <p className="text-sm text-muted">Yeni test, aylıq sınaq, mövzu, video, paylaşım və coin haqqında telefonunuza xəbər gəlsin.</p>
        </div>
        {state === "loading" ? (
          <Spinner />
        ) : state === "on" ? (
          <button className="btn-secondary" onClick={disable} disabled={busy}>{busy ? <Spinner /> : "Bağla"}</button>
        ) : state === "off" ? (
          <button className="btn-primary" onClick={enable} disabled={busy}>{busy ? <Spinner /> : <><Icon name="bell" size={16} /> Aç</>}</button>
        ) : null}
      </div>
      {state === "on" && <p className="mt-3 text-sm font-semibold text-ok">Bu cihazda aktivdir.</p>}
      {state === "denied" && (
        <p className="mt-3 text-sm text-bad">Bildirişlər brauzerdə bloklanıb. Brauzerin sayt tənzimləmələrindən (ünvan sətrindəki kilid) “Bildirişlər”ə icazə verin.</p>
      )}
      {state === "ios-install" && (
        <div className="mt-3">
          <p className="text-sm font-semibold">iPhone-da bildiriş üçün saytı ana ekrana əlavə edin:</p>
          <IosSteps />
        </div>
      )}
      {state === "unsupported" && <p className="mt-3 text-sm text-muted">Bu brauzer bildirişləri dəstəkləmir. Telefonda Chrome (Android) və ya Safari (iPhone) istifadə edin.</p>}
    </section>
  );
}

/** Ana səhifədə bir dəfəlik təklif (bağlananda yadda qalır) */
export function PushPrompt() {
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(localStorage.getItem("push-prompt-hidden") === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden || (state !== "off" && state !== "ios-install")) return null;
  const close = () => {
    setHidden(true);
    try { localStorage.setItem("push-prompt-hidden", "1"); } catch { /* yaddaş bağlıdır */ }
  };
  return (
    <div className="card flex flex-wrap items-start gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint"><Icon name="bell" size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">Yeni test və sınaqlardan xəbərdar olun</p>
        {state === "ios-install" ? <IosSteps /> : <p className="text-sm text-muted">Telefon bildirişlərini açın — yeni test, aylıq sınaq xatırlatması və coin gələndə xəbər verək.</p>}
      </div>
      <div className="flex items-center gap-2">
        {state === "off" && <button className="btn-primary btn-sm" onClick={enable} disabled={busy}>{busy ? <Spinner /> : "Aç"}</button>}
        <button className="btn-ghost btn-sm" onClick={close} aria-label="Bağla">Sonra</button>
      </div>
    </div>
  );
}
