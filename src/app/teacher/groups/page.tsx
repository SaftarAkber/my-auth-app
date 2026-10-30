"use client";

import Link from "next/link";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { Empty, ErrorBox, Icon, Img, PageHeader, SkeletonList, useConfirm, useToast } from "@/components/ui";
import GroupEditModal from "@/components/GroupEditModal";

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  isActive: boolean;
  _count: { members: number; posts: number };
}

export default function TeacherGroupsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<{ groups: Group[] }>("/api/groups");
  const [editing, setEditing] = useState<Group | "new" | null>(null);
  const open = (g: Group | "new") => setEditing(g);

  async function remove(g: Group) {
    const ok = await confirm({
      title: `“${g.name}” qrupu silinsin?`,
      message: "Qrupun paylaşımları, üzvlükləri və müraciətləri də silinəcək. Bu əməliyyat geri qaytarılmır.",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/groups/${g.id}`, { method: "DELETE" });
      toast.success("Qrup silindi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function toggleActive(g: Group) {
    try {
      await api(`/api/groups/${g.id}`, { method: "PATCH", body: { isActive: !g.isActive } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const groups = data?.groups ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Qruplar"
        subtitle="Tələbələrinizi qruplara bölün, hər qrupa ayrıca məzmun verin"
        actions={<button className="btn-primary" onClick={() => open("new")}><Icon name="plus" size={16} /> Yeni qrup</button>}
      />

      {loading ? (
        <SkeletonList rows={3} className="h-44" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : groups.length === 0 ? (
        <Empty
          icon="users"
          title="Hələ qrup yoxdur"
          text="İlk qrupunuzu yaradın və tələbələr müraciət göndərsin."
          action={<button className="btn-primary" onClick={() => open("new")}>Qrup yarat</button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <article key={g.id} className="card overflow-hidden">
              <Link href={`/teacher/groups/${g.id}`} className="block">
                <div className="relative h-24 bg-gradient-to-br from-brand/70 to-brand/30">
                  {g.coverPhoto && <Img src={g.coverPhoto} className="h-full w-full object-cover" />}
                  {!g.isActive && <span className="badge-warn absolute right-3 top-3">Deaktiv</span>}
                </div>
                <div className="px-5 pt-4">
                  <h3 className="text-lg font-bold hover:text-brand">{g.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{g.description || "Təsvir yoxdur."}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="badge-muted"><Icon name="users" size={12} /> {g._count.members} üzv</span>
                    <span className="badge-muted"><Icon name="message" size={12} /> {g._count.posts} paylaşım</span>
                    {g.schedule && <span className="badge-muted"><Icon name="calendar" size={12} /> {g.schedule}</span>}
                  </div>
                </div>
              </Link>
              <div className="mt-4 flex items-center gap-2 border-t border-line px-3 py-2.5">
                <Link href={`/teacher/groups/${g.id}`} className="btn-soft btn-sm flex-1">Aç</Link>
                <button className="btn-icon" title={g.isActive ? "Deaktiv et" : "Aktiv et"} onClick={() => toggleActive(g)}>
                  <Icon name={g.isActive ? "eye" : "eyeOff"} size={17} />
                </button>
                <button className="btn-icon" title="Redaktə" onClick={() => open(g)}><Icon name="edit" size={17} /></button>
                <button className="btn-icon hover:!text-bad" title="Sil" onClick={() => remove(g)}><Icon name="trash" size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <GroupEditModal editing={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}
