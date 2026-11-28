import Link from "next/link";
import { Icon } from "@/components/ui";
import LangSwitch from "@/components/LangSwitch";
import { LogoMark } from "@/components/Logo";

const FEATURES = [
  { icon: "file", title: "Onlayn testlər", text: "Vaxtlı və ya sərbəst testlər, avtomatik yoxlama və detallı nəticələr." },
  { icon: "video", title: "Videodərslər", text: "Qrupunuza aid dərsləri istənilən vaxt izləyin, sual yazın." },
  { icon: "coin", title: "Coin və mağaza", text: "Müəllimdən coin qazanın, mağazada hədiyyələrə dəyişin." },
] as const;

function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={42} tone={light ? "light" : "dark"} />
      <span className={`text-2xl font-extrabold tracking-tight ${light ? "text-white" : "text-brand"}`}>Tworing</span>
    </span>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="relative"><Logo light /></Link>

        <div className="relative max-w-md">
          <h2 className="text-5xl font-bold leading-[1.1] tracking-tight">Öyrən, yoxla, irəlilə.</h2>
          <p className="mt-4 text-lg text-white/80">Müəllim və tələbələr üçün bir yerdə dərslər, testlər və nəticələr.</p>
          <ul className="mt-10 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4 rounded-xl border border-white/15 bg-white/10 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/15">
                  <Icon name={f.icon} size={20} />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/70">© {new Date().getFullYear()} Tworing</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-8"><LangSwitch /></div>
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-6 inline-block lg:hidden"><Logo /></Link>
          <div className="card p-6 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
