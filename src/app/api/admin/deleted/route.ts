import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError } from "@/lib/guards";

// Müəllimlərin sildiyi kolleksiya və test paketləri (yumşaq silmə): kim, nə vaxt
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const gone = { not: null } as const;
    const [cols, pkgs] = await Promise.all([
      prisma.collection.findMany({
        where: { deletedAt: gone },
        include: {
          teacher: { select: { name: true } },
          _count: { select: { packages: { where: { deletedAt: gone } } } },
        },
        orderBy: { deletedAt: "desc" },
        take: 200,
      }),
      prisma.testPackage.findMany({
        where: { deletedAt: gone },
        include: {
          collection: { select: { name: true, deletedAt: true, teacher: { select: { name: true } } } },
          group: { select: { teacher: { select: { name: true } } } },
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { deletedAt: "desc" },
        take: 300,
      }),
    ]);

    const ids = [...new Set([...cols.map((c) => c.deletedById), ...pkgs.map((p) => p.deletedById)].filter((x): x is string => !!x))];
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const who = new Map(users.map((u) => [u.id, u.name]));

    const items = [
      ...cols.map((c) => ({
        kind: "collection" as const,
        id: c.id,
        name: c.name,
        owner: c.teacher.name,
        deletedAt: c.deletedAt!.toISOString(),
        deletedBy: c.deletedById ? who.get(c.deletedById) ?? "—" : "—",
        info: `${c._count.packages} test paketi`,
        parent: null as string | null,
      })),
      ...pkgs.map((p) => ({
        kind: "package" as const,
        id: p.id,
        name: p.name,
        owner: p.collection?.teacher.name ?? p.group?.teacher.name ?? "—",
        deletedAt: p.deletedAt!.toISOString(),
        deletedBy: p.deletedById ? who.get(p.deletedById) ?? "—" : "—",
        info: `${p._count.questions} sual · ${p._count.attempts} cəhd`,
        // kolleksiya ilə birgə silinibsə qeyd olunur
        parent:
          p.collection && p.collection.deletedAt && p.collection.deletedAt.getTime() === p.deletedAt!.getTime()
            ? p.collection.name
            : null,
      })),
    ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error);
  }
}
