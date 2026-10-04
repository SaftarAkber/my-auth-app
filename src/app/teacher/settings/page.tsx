"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ContactCard, PasswordCard, ProfileEditor } from "@/components/settings";
import { Avatar, Icon, PageHeader } from "@/components/ui";

export default function TeacherSettingsPage() {
  const { user, logout } = useAuth();
  const [edit, setEdit] = useState(false);
  if (!user) return null;

  return (
    <div className="page-narrow space-y-5">
      <PageHeader title="Tənzimləmələr" subtitle="Profil, əlaqə və təhlükəsizlik" />

      <section className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <Avatar src={user.photo} name={user.name} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{user.name}</p>
          <p className="line-clamp-2 text-sm text-muted">{user.bio || "Haqqınızda məlumat əlavə edin."}</p>
        </div>
        <button className="btn-secondary" onClick={() => setEdit(true)}>
          <Icon name="edit" size={16} /> Profili redaktə et
        </button>
      </section>
      {edit && <ProfileEditor open onClose={() => setEdit(false)} withCover />}

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
