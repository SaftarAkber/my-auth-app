export interface SiteContent {
  brand: string;
  heroTitle: string;
  heroText: string;
  heroBtn: string;
  features: { title: string; text: string }[];
  stepsTitle: string;
  steps: { title: string; text: string }[];
  closeTitle: string;
  closeText: string;
  footer: string;
  show: { features: boolean; steps: boolean; close: boolean };
}

export const DEFAULT_SITE: SiteContent = {
  brand: "EduFlow",
  heroTitle: "Test həll et, coin qazan.",
  heroText:
    "EduFlow müəllimin qruplarını, video dərslərini və testlərini bir yerə yığır. Tələbə müəllimdən coin qazanır və mağazada xərcləyir.",
  heroBtn: "Hesab yarat",
  features: [
    { title: "Qrup qur.", text: "Müəllim qrup yaradır, tələbə müraciət göndərir, müəllim qəbul edir." },
    { title: "Videonu aç.", text: "Dərsləri paketlərə böl, yalnız seçdiyin qruplara göstər." },
    { title: "Testi vaxtla.", text: "Çoxseçimli və açıq suallar, vaxt limiti, təkrar cəhd icazəsi." },
    { title: "Coini xərclə.", text: "Müəllimdən qazandığın coini mağazada hədiyyəyə çevir." },
  ],
  stepsTitle: "Dörd addım.",
  steps: [
    { title: "Qeydiyyat", text: "Telefon və ya email ilə hesab aç, rolunu seç." },
    { title: "Müraciət", text: "Müəllimin qrupunu seç, qısa mesajla müraciət göndər." },
    { title: "Dərs və test", text: "Video dərsləri izlə, testləri həll et." },
    { title: "Coin", text: "Müəllimdən qazandığın coini mağazada xərclə." },
  ],
  closeTitle: "Bu gün başla.",
  closeText: "Hesab yaratmaq bir dəqiqə çəkir. Tələbə kimi qrupa qoşul, müəllim kimi qrupunu qur.",
  footer: "© EduFlow",
  show: { features: true, steps: true, close: true },
};

export function mergeSite(d: Partial<SiteContent> | null | undefined): SiteContent {
  const x = d ?? {};
  return { ...DEFAULT_SITE, ...x, show: { ...DEFAULT_SITE.show, ...(x.show ?? {}) } };
}

