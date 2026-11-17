import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, requireTeacher, serverError, teacherOwnsGroups, unauthorized } from "@/lib/guards";
import {
  cleanIds, ownedTestWhere, sanitizeTopicHtml, studentCanSeeTopic, testLiteSelect, videoLiteSelect, visibleTestWhere,
} from "@/lib/topics";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await optionalUser();
    if (!user) return unauthorized();

    const base = await prisma.topic.findUnique({ where: { id }, select: { teacherId: true } });
    if (!base) return notFound("Mövzu tapılmadı");

    // Müəllim (sahibi): hər şey, qaralama test/videolar da (vəziyyəti ilə)
    if (base.teacherId === user.id) {
      const [topic, myGroups] = await Promise.all([
        prisma.topic.findUnique({
          where: { id },
          select: {
            id: true, title: true, content: true, isPublished: true, visibility: true, updatedAt: true,
            groups: { select: { group: { select: { id: true, name: true } } } },
            tests: { where: { package: { deletedAt: null } }, orderBy: { order: "asc" }, select: { package: { select: testLiteSelect() } } },
            videos: { orderBy: { order: "asc" }, select: { video: { select: { ...videoLiteSelect, isActive: true } } } },
          },
        }),
        prisma.group.findMany({ where: { teacherId: user.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
      ]);
      if (!topic) return notFound("Mövzu tapılmadı");
      return NextResponse.json({
        owner: true,
        myGroups,
        topic: {
          ...topic,
          groups: topic.groups.map((g) => g.group),
          tests: topic.tests.map((t) => t.package),
          videos: topic.videos.map((v) => v.video),
        },
      });
    }

    // Tələbə: dərc olunmuş və hərkəsə açıq və ya qrupuna paylaşılmış mövzu; yalnız ona açıq test və videolar
    if (user.role !== "STUDENT") return forbidden();
    const access = await studentCanSeeTopic(id, user.id);
    if (!access.allowed) return forbidden();
    const gids = access.groupIds;

    const topic = await prisma.topic.findUnique({
      where: { id },
      select: {
        id: true, title: true, content: true, updatedAt: true,
        teacher: { select: { id: true, name: true, photo: true } },
        groups: { where: { groupId: { in: gids } }, select: { group: { select: { id: true, name: true } } } },
        tests: {
          where: { package: visibleTestWhere(gids) },
          orderBy: { order: "asc" },
          select: { package: { select: testLiteSelect(user.id) } },
        },
        videos: {
          where: { video: { isActive: true, isPublished: true, OR: [{ visibility: "PUBLIC" }, { videoGroups: { some: { groupId: { in: gids } } } }] } },
          orderBy: { order: "asc" },
          select: { video: { select: videoLiteSelect } },
        },
      },
    });
    if (!topic) return notFound("Mövzu tapılmadı");
    return NextResponse.json({
      owner: false,
      topic: {
        ...topic,
        groups: topic.groups.map((g) => g.group),
        tests: topic.tests.map((t) => t.package),
        videos: topic.videos.map((v) => v.video),
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

/** Mövzunu dəyiş (müəllim): ad, kitabxana, vəziyyət, qruplar, bağlı testlər və videolar */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const teacherId = auth.user.id;

    const topic = await prisma.topic.findUnique({ where: { id }, select: { teacherId: true } });
    if (!topic) return notFound("Mövzu tapılmadı");
    if (topic.teacherId !== teacherId) return forbidden();

    const b = await req.json().catch(() => ({}));
    const data: { title?: string; content?: string; isPublished?: boolean; visibility?: "PUBLIC" | "GROUP_ONLY" } = {};
    if (b.title !== undefined) {
      const title = typeof b.title === "string" ? b.title.trim().slice(0, 120) : "";
      if (!title) return NextResponse.json({ error: "Mövzunun adını yazın" }, { status: 400 });
      data.title = title;
    }
    if (b.content !== undefined) {
      if (typeof b.content !== "string") return NextResponse.json({ error: "Yanlış məzmun" }, { status: 400 });
      data.content = sanitizeTopicHtml(b.content);
    }
    if (b.isPublished !== undefined) data.isPublished = !!b.isPublished;
    if (b.visibility !== undefined) {
      if (b.visibility !== "PUBLIC" && b.visibility !== "GROUP_ONLY") return NextResponse.json({ error: "Yanlış görünmə" }, { status: 400 });
      data.visibility = b.visibility;
    }

    const groupIds = cleanIds(b.groupIds, 50);
    const testIds = cleanIds(b.testIds);
    const videoIds = cleanIds(b.videoIds);

    if (groupIds && !(await teacherOwnsGroups(teacherId, groupIds))) return forbidden();
    // «Qruplara» dərc etmək üçün ən azı bir qrup lazımdır
    if (data.isPublished && data.visibility === "GROUP_ONLY" && groupIds && groupIds.length === 0) {
      return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
    }
    if (testIds?.length) {
      const n = await prisma.testPackage.count({ where: { id: { in: testIds }, ...ownedTestWhere(teacherId) } });
      if (n !== testIds.length) return forbidden();
    }
    if (videoIds?.length) {
      const n = await prisma.video.count({ where: { id: { in: videoIds }, teacherId } });
      if (n !== videoIds.length) return forbidden();
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (groupIds) {
        await tx.topicGroup.deleteMany({ where: { topicId: id } });
        if (groupIds.length) await tx.topicGroup.createMany({ data: groupIds.map((groupId) => ({ topicId: id, groupId })) });
      }
      if (testIds) {
        await tx.topicTest.deleteMany({ where: { topicId: id } });
        if (testIds.length) await tx.topicTest.createMany({ data: testIds.map((packageId, order) => ({ topicId: id, packageId, order })) });
      }
      if (videoIds) {
        await tx.topicVideo.deleteMany({ where: { topicId: id } });
        if (videoIds.length) await tx.topicVideo.createMany({ data: videoIds.map((videoId, order) => ({ topicId: id, videoId, order })) });
      }
      return tx.topic.update({ where: { id }, data, select: { id: true, content: true, updatedAt: true, isPublished: true, visibility: true, title: true } });
    });

    return NextResponse.json({ topic: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const topic = await prisma.topic.findUnique({ where: { id }, select: { teacherId: true } });
    if (!topic) return notFound("Mövzu tapılmadı");
    if (topic.teacherId !== auth.user.id) return forbidden();
    // Yalnız mövzu və bağlantılar silinir; test paketləri və videolar yerində qalır
    await prisma.topic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
