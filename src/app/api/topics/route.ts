import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, requireTeacher, serverError, teacherOwnsGroups, unauthorized } from "@/lib/guards";
import { cleanIds, groupTopicsForStudent, studentGroupIds, visibleTestWhere } from "@/lib/topics";

/** Qrupun mövzuları. Müəllim (qrupun sahibi) qaralamaları və hərkəsə açıq mövzularını da görür; tələbə – qrupa paylaşılan (üzvdürsə) və hərkəsə açıq dərc olunmuş mövzuları. */
export async function GET(req: NextRequest) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const groupId = req.nextUrl.searchParams.get("groupId");
    // Müəllimin bütün mövzuları (müəllim panelindəki "Mövzular" səhifəsi)
    if (!groupId) {
      if (user.role !== "TEACHER") return NextResponse.json({ error: "groupId lazımdır" }, { status: 400 });
      const [rows, myGroups] = await Promise.all([
        prisma.topic.findMany({
          where: { teacherId: user.id },
          select: {
            id: true, title: true, isPublished: true, visibility: true, order: true, updatedAt: true,
            groups: { select: { groupId: true } },
            _count: { select: { tests: { where: { package: { deletedAt: null } } }, videos: true } },
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        }),
        prisma.group.findMany({ where: { teacherId: user.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
      ]);
      const topics = rows.map(({ groups, ...t }) => ({ ...t, groupIds: groups.map((x) => x.groupId) }));
      return NextResponse.json({ topics, owner: true, myGroups });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group) return notFound("Qrup tapılmadı");

    if (user.id === group.teacherId) {
      const [rows, myGroups] = await Promise.all([
        prisma.topic.findMany({
          where: { teacherId: user.id, OR: [{ groups: { some: { groupId } } }, { visibility: "PUBLIC", isPublished: true }] },
          select: {
            id: true, title: true, isPublished: true, visibility: true, order: true, updatedAt: true,
            groups: { select: { groupId: true } },
            _count: { select: { tests: { where: { package: { deletedAt: null } } }, videos: true } },
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        }),
        prisma.group.findMany({ where: { teacherId: user.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
      ]);
      const topics = rows.map(({ groups, ...t }) => ({ ...t, groupIds: groups.map((x) => x.groupId) }));
      return NextResponse.json({ topics, owner: true, myGroups });
    }

    if (user.role !== "STUDENT") return forbidden();
    const gids = await studentGroupIds(user.id);
    const isMember = gids.includes(groupId);

    const topics = await prisma.topic.findMany({
      where: groupTopicsForStudent(groupId, group.teacherId, isMember),
      select: {
        id: true, title: true, isPublished: true, visibility: true, order: true, updatedAt: true,
        _count: {
          select: {
            tests: { where: { package: visibleTestWhere(gids) } },
            videos: { where: { video: { isActive: true, isPublished: true, OR: [{ visibility: "PUBLIC" }, { videoGroups: { some: { groupId: { in: gids } } } }] } } },
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ topics, owner: false });
  } catch (error) {
    return serverError(error);
  }
}

/** Yeni mövzu (müəllim). Başlanğıcda qaralamadır. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const b = await req.json().catch(() => ({}));
    const title = typeof b.title === "string" ? b.title.trim().slice(0, 120) : "";
    if (!title) return NextResponse.json({ error: "Mövzunun adını yazın" }, { status: 400 });
    const groupIds = cleanIds(b.groupIds, 50) ?? [];
    if (!(await teacherOwnsGroups(auth.user.id, groupIds))) return forbidden();

    const last = await prisma.topic.aggregate({ where: { teacherId: auth.user.id }, _max: { order: true } });
    const topic = await prisma.topic.create({
      data: {
        title,
        teacherId: auth.user.id,
        order: (last._max.order ?? 0) + 1,
        groups: { create: groupIds.map((groupId) => ({ groupId })) },
      },
      select: { id: true },
    });
    return NextResponse.json({ id: topic.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
