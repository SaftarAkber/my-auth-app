"use client";

import { useCallback, useEffect, useState } from "react";

export type Lang = "AZ" | "RU" | "EN";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "AZ", label: "Azərbaycanca" },
  { code: "RU", label: "Русский" },
  { code: "EN", label: "English" },
];

// Naviqasiya və qabıq mətnləri. Səhifə daxili mətnlər mərhələ-mərhələ əlavə olunur.
const DICT = {
  groups: { AZ: "Qruplar", RU: "Группы", EN: "Groups" },
  topics: { AZ: "Mövzular", RU: "Темы", EN: "Topics" },
  tests: { AZ: "Testlər", RU: "Тесты", EN: "Tests" },
  tasks: { AZ: "Tapşırıqlar", RU: "Задания", EN: "Tasks" },
  home: { AZ: "Ana səhifə", RU: "Главная", EN: "Home" },
  videos: { AZ: "Videolar", RU: "Видео", EN: "Videos" },
  students: { AZ: "Tələbələr", RU: "Студенты", EN: "Students" },
  shop: { AZ: "Mağaza", RU: "Магазин", EN: "Shop" },
  dashboard: { AZ: "Dashboard", RU: "Панель", EN: "Dashboard" },
  users: { AZ: "İstifadəçilər", RU: "Пользователи", EN: "Users" },
  content: { AZ: "Məzmun", RU: "Контент", EN: "Content" },
  site: { AZ: "Sayt", RU: "Сайт", EN: "Site" },
  deleted: { AZ: "Silinənlər", RU: "Удалённое", EN: "Deleted" },
  pins: { AZ: "Sancaqlar", RU: "Закреплённые", EN: "Pinned" },
  search: { AZ: "Müəllim, tələbə, test, video axtar…", RU: "Поиск: учитель, студент, тест, видео…", EN: "Search teachers, students, tests, videos…" },
  searchNone: { AZ: "Nəticə tapılmadı", RU: "Ничего не найдено", EN: "No results" },
  language: { AZ: "Dil", RU: "Язык", EN: "Language" },
  notifications: { AZ: "Bildirimlər", RU: "Уведомления", EN: "Notifications" },
  noNotifications: { AZ: "Yeni bildirim yoxdur", RU: "Новых уведомлений нет", EN: "No new notifications" },
  coin: { AZ: "Coin balansı", RU: "Баланс монет", EN: "Coin balance" },
  profile: { AZ: "Profil", RU: "Профиль", EN: "Profile" },
  logout: { AZ: "Çıxış", RU: "Выйти", EN: "Log out" },
  people: { AZ: "İnsanlar", RU: "Люди", EN: "People" },
} as const;

export type DictKey = keyof typeof DICT;
export const LANG_KEY = "eduflow-lang";
const KEY = LANG_KEY;

/** Brauzerdə yadda saxlanmış dil (yoxdursa AZ) */
export function getLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.some((l) => l.code === saved)) return saved;
  } catch {
    /* localStorage əlçatmazdır */
  }
  return "AZ";
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>("AZ");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Lang | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
    } catch {
      /* localStorage əlçatmazdırsa susmaya görə AZ */
    }
  }, []);

  // Dil dəyişəndə səhifə yenilənir: bütün mətnlər (tarixlər daxil) yeni dildə yenidən çəkilir
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const t = useCallback((k: DictKey) => DICT[k][lang], [lang]);
  return { lang, setLang, t };
}
