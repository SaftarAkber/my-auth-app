import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rewardData } from "@/lib/rewards";
import {
  forbidden,
  notFound,
  requireTeacher,
  serverError,
  teacherOwnsGroups,
  teacherOwnsTestPackage,
  unauthorized,
} from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const { id } = await params;
    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        collection: { select: { name: true, teacherId: true } },
        group: { select: { teacherId: true } },
        testPackageGroups: { include: { group: { select: { id: true, name: true, teacherId: true } } } },
        _count: { select: { attempts: true } },
      },
    });
    if (!pkg) return notFound();

    const isOwner =
      currentUser.role === "TEACHER" &&
      (pkg.collection?.teacherId === currentUser.id ||
        pkg.group?.teacherId === currentUser.id ||
        pkg.testPackageGroups.some((g) => g.group.teacherId === currentUser.id));

    // Tələbə üçün cavab açarını gizlədirik
    if (!isOwner) {
      if (!pkg.isPublished) return notFound();
      const safe = {
        ...pkg,
        questions: pkg.questions
          .filter((q) => q.isActive)
          .map((q) => ({ ...q, correctAnswer: undefined })),
      };
      return NextResponse.json({ package: safe });
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, id))) return forbidden();

    const body = await req.json();
    const {
      name, description, isPublished, isPublic,
      isTimed, duration, startsAt, endsAt,
      visibility, groupIds, allowRetry, shareAnswers,
    } = body;

    if (Array.isArray(groupIds) && !(await teacherOwnsGroups(auth.user.id, groupIds))) {
      return forbidden();
    }

    const existing = await prisma.testPackage.findUnique({
      where: { id },
      include: {
        _count: { select: { questions: true } },
        collection: { select: { visibility: true, groups: { select: { groupId: true } } } },
        testPackageGroups: { select: { groupId: true } },
      },
    });
    if (!existing) return notFound();

    // Məhdud kolleksiyada paket yalnız kolleksiyanın qruplarına dərc oluna bilər, hər qrup üçün ayrıca
    const restricted = existing.collection?.visibility === "GROUP_ONLY";
    const linkIds: string[] | undefined = Array.isArray(groupIds) ? groupIds : undefined;
    let pub = isPublished;
    let vis = visibility;
    let open = isPublic;
    if (restricted) {
      const allowed = new Set(existing.collection!.groups.map((g) => g.groupId));
      if (linkIds && linkIds.some((g: string) => !allowed.has(g))) {
        return NextResponse.json({ error: "Qrup bu kolleksiyaya açıq deyil" }, { status: 400 });
      }
      vis = "GROUP_ONLY";
      open = false;
      const finalLinks = linkIds ?? existing.testPackageGroups.map((g) => g.groupId);
      if (linkIds) pub = finalLinks.length > 0 ? (isPublished ?? true) : false;
      if (pub === true && finalLinks.length === 0) {
        return NextResponse.json({ error: "Əvvəlcə dərc ediləcək qrupu seçin" }, { status: 400 });
      }
    }

    if ((restricted ? pub : isPublished) === true && existing._count.questions === 0) {
      return NextResponse.json({ error: "Sualsız testi dərc etmək olmaz" }, { status: 400 });
    }

    const pkg = await prisma.$transaction(async (tx) => {
      // Qrup bağlantıları yalnız siyahı göndərildikdə yenilənir
      if (linkIds) {
        await tx.testPackageGroup.deleteMany({ where: { packageId: id } });
      }
      return tx.testPackage.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...((restricted ? pub : isPublished) !== undefined && { isPublished: restricted ? pub : isPublished }),
          ...((restricted ? open : isPublic) !== undefined && { isPublic: restricted ? open : isPublic }),
          ...(isTimed !== undefined && { isTimed, ...(isTimed ? {} : { duration: null }) }),
          ...(duration !== undefined && isTimed !== false && { duration }),
          ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
          ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
          ...((restricted ? vis : visibility) !== undefined && { visibility: restricted ? vis : visibility }),
          ...(allowRetry !== undefined && { allowRetry }),
          ...(shareAnswers !== undefined && { shareAnswers: !!shareAnswers }),
          ...rewardData(body),
          ...(linkIds && linkIds.length
            ? { testPackageGroups: { create: [...new Set<string>(linkIds)].map((groupId) => ({ groupId })) } }
            : {}),
        },
        include: {
          testPackageGroups: { include: { group: { select: { id: true, name: true } } } },
        },
      });
    });

    return NextResponse.json({ package: pkg });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, id))) return forbidden();

    // Yumşaq silmə: hər yerdən gizlənir, admin silinənlərdən bərpa edə bilir
    await prisma.testPackage.update({ where: { id }, data: { deletedAt: new Date(), deletedById: auth.user.id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
