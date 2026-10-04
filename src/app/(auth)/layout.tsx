import Link from "next/link";
import { Icon } from "@/components/ui";

const FEATURES = [
  { icon: "file", title: "Onlayn testlər", text: "Vaxtlı və ya sərbəst testlər, avtomatik yoxlama və detallı nəticələr." },
  { icon: "video", title: "Videodərslər", text: "Qrupunuza aid dərsləri istənilən vaxt izləyin, şərh yazın." },
  { icon: "coin", title: "Coin və market", text: "Düzgün cavablara coin qazanın, mükafatlara dəyişin." },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/20 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
            <Icon name="grad" size={24} />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">EduFlow</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Öyrən, yoxla, irəlilə.</h2>
          <p className="mt-3 text-lg text-white/80">Müəllim və tələbələr üçün bir yerdə dərslər, testlər və nəticələr.</p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon name={f.icon} size={20} />
                </span>
                <div>
                  <p className="font-bold">{f.title}</p>
                  <p className="text-sm text-white/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} EduFlow</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <Icon name="grad" size={22} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">EduFlow</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
