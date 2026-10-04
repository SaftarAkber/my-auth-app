"use client";

import { useAuth } from "@/context/AuthContext";
import { ContactCard, PasswordCard } from "@/components/settings";
import { Icon, PageHeader } from "@/components/ui";

export default function StudentSettingsPage() {
  const { logout } = useAuth();
  return (
    <div className="page-narrow space-y-5">
      <PageHeader title="Tənzimləmələr" subtitle="Hesab və təhlükəsizlik" />
      <ContactCard />
      <PasswordCard />
      <section className="card flex items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Hesabdan çıxış</h2>
          <p className="text-sm text-muted">Bu cihazda sessiyanı bitirin.</p>
        </div>
        <button className="btn-secondary" onClick={logout}>
          <Icon name="logout" size={16} /> Çıxış
        </button>
      </section>
    </div>
  );
}
