import AppShell from "@/components/AppShell";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="TEACHER">{children}</AppShell>;
}
