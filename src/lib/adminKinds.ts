import { prisma } from "@/lib/prisma";

export interface FieldSpec {
  key: string;
  label: string;
  type: "text" | "textarea" | "bool" | "select";
  options?: { value: string; label: string }[];
}

export interface AdminItem {
  id: string;
  title: string;
  sub: string;
  owner: string;
  values: Record<string, string | boolean | null>;
}

interface Spec {
  label: string;
  fields: FieldSpec[];
  list(q: string): Promise<AdminItem[]>;
  update(id: string, d: Record<string, unknown>): Promise<unknown>;
  remove(id: string): Promise<unknown>;
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const has = (q: string) => (q ? { contains: q, mode: "insensitive" as const } : undefined);

const VIS = [
  { value: "PUBLIC", label: "Hamıya açıq" },
  { value: "GROUP", label: "Yalnız qrup" },
];

export const ADMIN_KINDS: Record<string, Spec> = {
  groups: {
    label: "Qruplar",
    fields: [
      { key: "name", label: "Ad", type: "text" },
      { key: "description", label: "Təsvir", type: "textarea" },
      { key: "schedule", label: "Cədvəl", type: "text" },
      { key: "isActive", label: "Aktiv", type: "bool" },
    ],
    async list(q) {
      const rows = await prisma.group.findMany({
        where: q ? { OR: [{ name: has(q) }, { teacher: { name: has(q) } }] } : undefined,
        include: { teacher: { select: { name: true } }, _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((g) => ({
        id: g.id, title: g.name, sub: `${g._count.members} tələbə${g.schedule ? ` · ${g.schedule}` : ""}${g.isActive ? "" : " · deaktiv"}`,
        owner: g.teacher.name,
        values: { name: g.name, description: g.description, schedule: g.schedule, isActive: g.isActive },
      }));
    },
    update: (id, d) =>
      prisma.group.update({
        where: { id },
        data: clean({ name: str(d.name, 120) || undefined, description: str(d.description), schedule: str(d.schedule, 200), isActive: bool(d.isActive) }),
      }),
    remove: (id) => prisma.group.delete({ where: { id } }),
  },

  tests: {
    label: "Testlər",
    fields: [
      { key: "name", label: "Ad", type: "text" },
      { key: "description", label: "Təsvir", type: "textarea" },
      { key: "isPublished", label: "Dərc olunub", type: "bool" },
      { key: "isPublic", label: "Profildə hamıya açıq", type: "bool" },
    ],
    async list(q) {
      const rows = await prisma.testPackage.findMany({
        where: q ? { name: has(q) } : undefined,
        include: {
          _count: { select: { questions: true } },
          collection: { select: { teacher: { select: { name: true } } } },
          group: { select: { teacher: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((t) => ({
        id: t.id, title: t.name, sub: `${t._count.questions} sual · ${t.isPublished ? "dərc olunub" : "qaralama"}`,
        owner: t.collection?.teacher.name ?? t.group?.teacher.name ?? "—",
        values: { name: t.name, description: t.description, isPublished: t.isPublished, isPublic: t.isPublic },
      }));
    },
    update: (id, d) =>
      prisma.testPackage.update({
        where: { id },
        data: clean({ name: str(d.name, 160) || undefined, description: str(d.description), isPublished: bool(d.isPublished), isPublic: bool(d.isPublic) }),
      }),
    remove: (id) => prisma.testPackage.delete({ where: { id } }),
  },

  questions: {
    label: "Test sualları",
    fields: [
      { key: "text", label: "Sual mətni", type: "textarea" },
      { key: "isActive", label: "Aktiv", type: "bool" },
    ],
    async list(q) {
      const rows = await prisma.question.findMany({
        where: q ? { text: has(q) } : undefined,
        include: { package: { select: { name: true, collection: { select: { teacher: { select: { name: true } } } } } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((x) => ({
        id: x.id, title: x.text, sub: `${x.package.name} · ${x.type === "MULTIPLE_CHOICE" ? "qapalı" : "açıq"}`,
        owner: x.package.collection?.teacher.name ?? "—",
        values: { text: x.text, isActive: x.isActive },
      }));
    },
    update: (id, d) =>
      prisma.question.update({ where: { id }, data: clean({ text: str(d.text, 2000) || undefined, isActive: bool(d.isActive) }) }),
    remove: (id) => prisma.question.delete({ where: { id } }),
  },

  videopacks: {
    label: "Video paketləri",
    fields: [
      { key: "name", label: "Ad", type: "text" },
      { key: "description", label: "Təsvir", type: "textarea" },
      { key: "isPublished", label: "Dərc olunub", type: "bool" },
      { key: "isPublic", label: "Profildə hamıya açıq", type: "bool" },
    ],
    async list(q) {
      const rows = await prisma.videoPackage.findMany({
        where: q ? { name: has(q) } : undefined,
        include: { _count: { select: { videos: true } }, teacher: { select: { name: true } }, collection: { select: { teacher: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((v) => ({
        id: v.id, title: v.name, sub: `${v._count.videos} video · ${v.isPublished ? "dərc olunub" : "qaralama"}`,
        owner: v.teacher?.name ?? v.collection?.teacher.name ?? "—",
        values: { name: v.name, description: v.description, isPublished: v.isPublished, isPublic: v.isPublic },
      }));
    },
    update: (id, d) =>
      prisma.videoPackage.update({
        where: { id },
        data: clean({ name: str(d.name, 160) || undefined, description: str(d.description), isPublished: bool(d.isPublished), isPublic: bool(d.isPublic) }),
      }),
    remove: (id) => prisma.videoPackage.delete({ where: { id } }),
  },

  videos: {
    label: "Videolar",
    fields: [
      { key: "title", label: "Başlıq", type: "text" },
      { key: "description", label: "Təsvir", type: "textarea" },
      { key: "url", label: "Link", type: "text" },
      { key: "isActive", label: "Aktiv", type: "bool" },
    ],
    async list(q) {
      const rows = await prisma.video.findMany({
        where: q ? { OR: [{ title: has(q) }, { teacher: { name: has(q) } }] } : undefined,
        include: { teacher: { select: { name: true } }, package: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((v) => ({
        id: v.id, title: v.title, sub: `${v.package?.name ?? "paketsiz"} · ${v.url}`,
        owner: v.teacher.name,
        values: { title: v.title, description: v.description, url: v.url, isActive: v.isActive },
      }));
    },
    update: (id, d) =>
      prisma.video.update({
        where: { id },
        data: clean({ title: str(d.title, 160) || undefined, description: str(d.description), url: str(d.url, 500) || undefined, isActive: bool(d.isActive) }),
      }),
    remove: (id) => prisma.video.delete({ where: { id } }),
  },

  posts: {
    label: "Paylaşımlar",
    fields: [
      { key: "content", label: "Mətn", type: "textarea" },
      { key: "visibility", label: "Görünürlük", type: "select", options: VIS },
    ],
    async list(q) {
      const rows = await prisma.groupPost.findMany({
        where: q ? { OR: [{ content: has(q) }, { teacher: { name: has(q) } }] } : undefined,
        include: { teacher: { select: { name: true } }, group: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((p) => ({
        id: p.id, title: p.content, sub: `${p.group.name} · ${p.visibility === "PUBLIC" ? "hamıya açıq" : "yalnız qrup"}`,
        owner: p.teacher.name,
        values: { content: p.content, visibility: p.visibility },
      }));
    },
    update: (id, d) =>
      prisma.groupPost.update({
        where: { id },
        data: clean({
          content: str(d.content, 5000) || undefined,
          visibility: d.visibility === "PUBLIC" || d.visibility === "GROUP" ? (d.visibility as "PUBLIC" | "GROUP") : undefined,
        }),
      }),
    remove: (id) => prisma.groupPost.delete({ where: { id } }),
  },

  requests: {
    label: "Müraciətlər",
    fields: [
      { key: "message", label: "Tələbənin mesajı", type: "textarea" },
      { key: "teacherReply", label: "Müəllimin cavabı", type: "textarea" },
      {
        key: "status", label: "Vəziyyət", type: "select",
        options: [
          { value: "PENDING", label: "Gözləyir" },
          { value: "ACCEPTED", label: "Qəbul edilib" },
          { value: "DECLINED", label: "Rədd edilib" },
        ],
      },
    ],
    async list(q) {
      const rows = await prisma.enrollmentRequest.findMany({
        where: q ? { OR: [{ student: { name: has(q) } }, { group: { name: has(q) } }] } : undefined,
        include: { student: { select: { name: true } }, group: { select: { name: true } }, teacher: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id, title: `${r.student.name} → ${r.group.name}`, sub: `${r.status}${r.message ? ` · ${r.message}` : ""}`,
        owner: r.teacher.name,
        values: { message: r.message, teacherReply: r.teacherReply, status: r.status },
      }));
    },
    update: (id, d) =>
      prisma.enrollmentRequest.update({
        where: { id },
        data: clean({
          message: str(d.message, 1000),
          teacherReply: str(d.teacherReply, 1000),
          status: d.status === "PENDING" || d.status === "ACCEPTED" || d.status === "DECLINED" ? (d.status as "PENDING" | "ACCEPTED" | "DECLINED") : undefined,
        }),
      }),
    remove: (id) => prisma.enrollmentRequest.delete({ where: { id } }),
  },

  comments: {
    label: "Video sualları",
    fields: [
      { key: "content", label: "Mətn", type: "textarea" },
      { key: "visibility", label: "Görünürlük", type: "select", options: [{ value: "PUBLIC", label: "Hamıya açıq" }, { value: "GROUP_ONLY", label: "Yalnız qrup" }] },
    ],
    async list(q) {
      const rows = await prisma.videoComment.findMany({
        where: q ? { OR: [{ content: has(q) }, { user: { name: has(q) } }] } : undefined,
        include: { user: { select: { name: true } }, video: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((c) => ({
        id: c.id, title: c.content, sub: `Video: ${c.video.title}`, owner: c.user.name,
        values: { content: c.content, visibility: c.visibility },
      }));
    },
    update: (id, d) =>
      prisma.videoComment.update({
        where: { id },
        data: clean({
          content: str(d.content, 2000) || undefined,
          visibility: d.visibility === "PUBLIC" || d.visibility === "GROUP_ONLY" ? (d.visibility as "PUBLIC" | "GROUP_ONLY") : undefined,
        }),
      }),
    remove: (id) => prisma.videoComment.delete({ where: { id } }),
  },
};
