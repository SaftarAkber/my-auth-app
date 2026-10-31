import AppShell from "@/components/AppShell";

// Video baxış səhifəsi: bütün rolların navbarı saxlanılır
export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="ANY">{children}</AppShell>;
}
