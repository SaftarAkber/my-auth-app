"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ApiInit {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}

/** JSON API köməkçisi: uğursuz cavabda `ApiError` atır (mesaj = serverin `error` sahəsi). */
export async function api<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* boş cavab */
  }
  if (!res.ok) throw new ApiError((data as { error?: string } | null)?.error ?? "Xəta baş verdi", res.status);
  return data as T;
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Xəta baş verdi";
}

/** Şəkil yükləmə (Cloudinary). URL qaytarır. */
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", "image");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error ?? "Yükləmə xətası", res.status);
  return data.url as string;
}

/** Sadə data-fetch hook-u. `url` null olarsa sorğu göndərilmir. */
export function useFetch<T = unknown>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  // Eyni ünvanın təkrar yüklənməsi (redaktədən sonra reload) arxa planda gedir: səhifə skeletə qayıtmır,
  // siyahı yerində qalır və brauzer yuxarı sürüşmür. `loading` yalnız ilk dəfə / ünvan dəyişəndə true olur.
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const loadedUrl = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    const background = loadedUrl.current === url;
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await api<T>(url);
      if (id === seq.current) {
        setData(d);
        setError(null);
        loadedUrl.current = url;
      }
    } catch (e) {
      // Arxa plan yeniləməsi alınmasa köhnə məlumat qalır (əməliyyatın öz xətası artıq göstərilib)
      if (id === seq.current && !background) setError(errMsg(e));
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [url]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { data, setData, error, loading, refreshing, reload: load };
}
