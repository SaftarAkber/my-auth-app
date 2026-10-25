/** Mağaza: arxa planda bulanıq məhsullar, üstündə “Tezliklə”. Məhsul şəkilləri kodla çəkilib. */
const P = ["#3d348b", "#7678ed", "#f7b801", "#f18701", "#f35b04", "#a7a1dc"];

const ITEMS: React.ReactNode[] = [
  // stəkan
  <svg key="mug" viewBox="0 0 100 100"><path d="M24 30h44v34a18 18 0 0 1-18 18h-8A18 18 0 0 1 24 64z" fill={P[0]} /><path d="M68 40h8a10 10 0 0 1 0 22h-8" fill="none" stroke={P[0]} strokeWidth="7" /></svg>,
  // xəritə
  <svg key="map" viewBox="0 0 100 100"><path d="M14 24l24 8 24-8 24 8v46l-24-8-24 8-24-8z" fill={P[2]} /><path d="M38 32v46M62 24v46" stroke={P[3]} strokeWidth="5" /><circle cx="50" cy="52" r="6" fill={P[4]} /></svg>,
  // kitablar
  <svg key="books" viewBox="0 0 100 100"><rect x="16" y="26" width="16" height="56" rx="3" fill={P[0]} /><rect x="36" y="18" width="16" height="64" rx="3" fill={P[1]} /><rect x="56" y="30" width="16" height="52" rx="3" fill={P[3]} /><rect x="76" y="24" width="10" height="58" rx="3" fill={P[4]} transform="rotate(8 80 50)" /></svg>,
  // çanta
  <svg key="bag" viewBox="0 0 100 100"><path d="M24 38h52l6 46H18z" fill={P[4]} /><path d="M36 38c0-14 6-22 14-22s14 8 14 22" fill="none" stroke={P[0]} strokeWidth="6" /></svg>,
  // səsucaldıcı
  <svg key="speaker" viewBox="0 0 100 100"><rect x="26" y="14" width="48" height="72" rx="10" fill={P[0]} /><circle cx="50" cy="38" r="12" fill={P[2]} /><circle cx="50" cy="66" r="7" fill={P[1]} /></svg>,
  // xüsusi qələm
  <svg key="pen" viewBox="0 0 100 100"><path d="M20 80L68 22l10 8-48 58-14 2z" fill={P[3]} /><path d="M68 22l8-8 10 8-8 8z" fill={P[0]} /></svg>,
  // saat
  <svg key="watch" viewBox="0 0 100 100"><rect x="36" y="8" width="28" height="84" rx="8" fill={P[5]} /><circle cx="50" cy="50" r="26" fill={P[0]} /><path d="M50 36v15l9 6" stroke={P[2]} strokeWidth="5" fill="none" /></svg>,
  // oyuncaq ayı
  <svg key="bear" viewBox="0 0 100 100"><circle cx="30" cy="26" r="11" fill={P[3]} /><circle cx="70" cy="26" r="11" fill={P[3]} /><circle cx="50" cy="48" r="26" fill={P[2]} /><circle cx="50" cy="76" r="20" fill={P[2]} /><circle cx="42" cy="44" r="3" fill="#0c0a1c" /><circle cx="58" cy="44" r="3" fill="#0c0a1c" /></svg>,
];

export default function ShopSoon() {
  return (
    <div className="card relative min-h-[520px] overflow-hidden bg-surface-2" role="img" aria-label="Mağaza tezliklə açılacaq">
      <div
        className="pointer-events-none absolute -inset-10 grid grid-cols-2 gap-6 p-14 opacity-90 sm:grid-cols-4"
        style={{ filter: "blur(22px) saturate(1.1)" }}
        aria-hidden
      >
        {[...ITEMS, ...ITEMS].map((svg, i) => (
          <div key={i} className="grid aspect-square place-items-center rounded-3xl bg-white p-5">{svg}</div>
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-white/40 text-center">
        <div>
          <h2 className="text-6xl font-extrabold tracking-tight sm:text-8xl" style={{ textShadow: "5px 5px 0 rgb(var(--sun))" }}>Tezliklə</h2>
          <p className="mt-3 text-lg font-semibold">Mağaza hazırlanır.</p>
        </div>
      </div>
    </div>
  );
}
