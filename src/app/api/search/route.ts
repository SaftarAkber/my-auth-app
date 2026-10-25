import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/guards";

// Ümumi axtarış: yalnız hamıya açıq məzmun (admin üçün hər şey)
export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
    if (q.length < 2) return NextResponse.json({ results: [] });

    const admin = me.role === "ADMIN";
    const contains = { contains: q, mode: "insensitive" as const };

    const [people, groups, tests, videos, posts] = await Promise.all([
      prisma.user.findMany({
        where: { name: contains, ...(admin ? {} : { role: { in: ["TEACHER", "STUDENT"] } }) },
        select: { id: true, name: true, role: true, photo: true },
        take: 6,
      }),
      prisma.group.findMany({
        where: { name: contains, ...(admin ? {} : { isActive: true }) },
        select: { id: true, name: true, teacherId: true, teacher: { select: { name: true } } },
        take: 5,
      }),
      prisma.testPackage.findMany({
        where: {
          name: contains,
          ...(admin ? {} : { isPublished: true, isPublic: true }),
        },
        select: {
          id: true, name: true,
          collection: { select: { teacherId: true, teacher: { select: { name: true } } } },
          group: { select: { teacherId: true, teacher: { select: { name: true } } } },
          testPackageGroups: { select: { group: { select: { teacherId: true, teacher: { select: { name: true } } } } }, take: 1 },
        },
        take: 5,
      }),
      prisma.video.findMany({
        where: {
          title: contains,
          ...(admin ? {} : { isActive: true, package: { isPublished: true, isPublic: true } }),
        },
        select: { id: true, title: true, teacherId: true, teacher: { select: { name: true } } },
        take: 5,
      }),
      prisma.groupPost.findMany({
        where: { content: contains, ...(admin ? {} : { visibility: "PUBLIC" }) },
        select: { id: true, content: true, teacherId: true, teacher: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const owner = (t: (typeof tests)[number]) =>
      t.collection ?? t.group ?? t.testPackageGroups[0]?.group ?? null;

    const results = [
      ...people.map((p) => ({
        kind: "people" as const, id: p.id, title: p.name, photo: p.photo,
        sub: p.role === "TEACHER" ? "Müəllim" : p.role === "ADMIN" ? "Admin" : "Tələbə",
        href: `/u/${p.id}`,
      })),
      ...groups.map((g) => ({
        kind: "groups" as const, id: g.id, title: g.name, photo: null, sub: `Qrup · ${g.teacher.name}`,
        href: `/u/${g.teacherId}?tab=groups`,
      })),
      ...tests.map((t) => {
        const o = owner(t);
        return {
          kind: "tests" as const, id: t.id, title: t.name, photo: null,
          sub: `Test${o ? ` · ${o.teacher.name}` : ""}`,
          href: o ? `/u/${o.teacherId}?tab=tests` : "/",
        };
      }),
      ...videos.map((v) => ({
        kind: "videos" as const, id: v.id, title: v.title, photo: null, sub: `Video · ${v.teacher.name}`,
        href: `/u/${v.teacherId}?tab=videos`,
      })),
      ...posts.map((p) => ({
        kind: "posts" as const, id: p.id, title: p.content.slice(0, 80), photo: null, sub: `Paylaşım · ${p.teacher.name}`,
        href: `/u/${p.teacherId}?tab=posts`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return serverError(error);
  }
}
