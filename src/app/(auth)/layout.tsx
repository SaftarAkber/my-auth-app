import Link from "next/link";
import { Icon } from "@/components/ui";

const FEATURES = [
  { icon: "file", title: "Onlayn testlər", text: "Vaxtlı və ya sərbəst testlər, avtomatik yoxlama və detallı nəticələr." },
  { icon: "video", title: "Videodərslər", text: "Qrupunuza aid dərsləri istənilən vaxt izləyin, sual yazın." },
  { icon: "coin", title: "Coin və mağaza", text: "Müəllimdən coin qazanın, mağazada hədiyyələrə dəyişin." },
] as const;

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-ink bg-white">
        <span className="h-4 w-4 rounded-full bg-ink" />
      </span>
      <span className="text-2xl font-extrabold tracking-tight">EduFlow</span>
    </span>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r-[3px] border-ink bg-sun p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border-[3px] border-ink bg-iris" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full border-[3px] border-ink bg-flame" />
        <Link href="/" className="relative"><Logo /></Link>

        <div className="relative max-w-md">
          <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tight">Öyrən, yoxla, irəlilə.</h2>
          <p className="mt-4 text-lg font-medium">Müəllim və tələbələr üçün bir yerdə dərslər, testlər və nəticələr.</p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="card flex gap-4 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-sun">
                  <Icon name={f.icon} size={20} />
                </span>
                <div>
                  <p className="font-bold">{f.title}</p>
                  <p className="text-sm text-muted">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm font-semibold">© {new Date().getFullYear()} EduFlow</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-6 inline-block lg:hidden"><Logo /></Link>
          <div className="card p-6 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
