import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { adjustCoins } from "@/lib/coins";
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

    const {
      name, description, isPublished, isPublic,
      isTimed, duration, startsAt, endsAt,
      visibility, groupIds, allowRetry,
    } = await req.json();

    if (Array.isArray(groupIds) && !(await teacherOwnsGroups(auth.user.id, groupIds))) {
      return forbidden();
    }

    const existing = await prisma.testPackage.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!existing) return notFound();

    if (isPublished === true && existing._count.questions === 0) {
      return NextResponse.json({ error: "Sualsız testi dərc etmək olmaz" }, { status: 400 });
    }

    const pkg = await prisma.$transaction(async (tx) => {
      // Qrup bağlantıları yalnız siyahı göndərildikdə yenilənir
      if (Array.isArray(groupIds)) {
        await tx.testPackageGroup.deleteMany({ where: { packageId: id } });
      }
      return tx.testPackage.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isPublished !== undefined && { isPublished }),
          ...(isPublic !== undefined && { isPublic }),
          ...(isTimed !== undefined && { isTimed, ...(isTimed ? {} : { duration: null }) }),
          ...(duration !== undefined && isTimed !== false && { duration }),
          ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
          ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
          ...(visibility !== undefined && { visibility }),
          ...(allowRetry !== undefined && { allowRetry }),
          ...(Array.isArray(groupIds) && groupIds.length
            ? { testPackageGroups: { create: groupIds.map((groupId: string) => ({ groupId })) } }
            : {}),
        },
        include: {
          testPackageGroups: { include: { group: { select: { id: true, name: true } } } },
        },
      });
    });

    // Müəllim testi ilk dəfə dərc edəndə 5 coin
    if (isPublished === true && !existing.isPublished) {
      try {
        await adjustCoins(auth.user.id, 5, "TEST_CREATED", `"${pkg.name}" dərc edildi`);
      } catch (coinErr) {
        console.error("Coin vermə xətası:", coinErr);
      }
    }

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

    await prisma.testPackage.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
