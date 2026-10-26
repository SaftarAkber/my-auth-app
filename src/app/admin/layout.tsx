"use client";

import AdminLogin from "@/components/AdminLogin";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/ui";

// Admin yalnız bu bölmədən daxil olur: girişsiz və ya admin olmayan istifadəçi giriş formunu görür.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user || user.role !== "ADMIN") return <AdminLogin />;
  return <AppShell role="ADMIN">{children}</AppShell>;
}
