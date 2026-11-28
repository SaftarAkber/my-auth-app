import AppShell from "@/components/AppShell";

// Ümumi axtarışın bütün nəticələri (hər rol üçün)
export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="ANY">{children}</AppShell>;
}
