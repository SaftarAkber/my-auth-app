import AppShell from "@/components/AppShell";

// Profil səhifələri hər rol üçün açıqdır (giriş tələb olunur)
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="ANY">{children}</AppShell>;
}
