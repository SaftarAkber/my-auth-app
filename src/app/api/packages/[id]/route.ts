import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ownerTeacherId, rewardData } from "@/lib/rewards";
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
        topicTests: { select: { topicId: true } },
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

const drawNum = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 200) : undefined;
};

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();
    const { id } = await params;
    // Müəllim öz testini, admin isə istənilən testi dəyişə bilər (qrup və mövzular sahib müəllimə aiddir)
    let ownerId: string | null = null;
    if (me.role === "ADMIN") ownerId = await ownerTeacherId(id);
    else if (me.role === "TEACHER" && (await teacherOwnsTestPackage(me.id, id))) ownerId = me.id;
    if (!ownerId) return forbidden();
    const auth = { user: { id: ownerId } };

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
    let linkIds: string[] | undefined = Array.isArray(groupIds) ? groupIds : undefined;
    let pub = isPublished;
    let vis = visibility;
    let open = isPublic;
    // Hər testin üç vəziyyəti var: qaralama / hamıya açıq / seçilmiş qruplar
    const st = body.state;
    if (st !== undefined) {
      if (st !== "draft" && st !== "public" && st !== "groups") {
        return NextResponse.json({ error: "Naməlum vəziyyət" }, { status: 400 });
      }
      if (st === "draft") pub = false;
      if (st === "public") {
        pub = true; vis = "PUBLIC"; open = true; linkIds = [];
      }
      if (st === "groups") {
        const ids: string[] = Array.isArray(groupIds) ? groupIds : [];
        if (ids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
        if (restricted) {
          const allowed = new Set(existing.collection!.groups.map((g) => g.groupId));
          if (ids.some((g) => !allowed.has(g))) return NextResponse.json({ error: "Qrup bu kolleksiyaya açıq deyil" }, { status: 400 });
        }
        pub = true; vis = "GROUP_ONLY"; open = false; linkIds = ids;
      }
    } else if (restricted) {
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

    if (pub === true && existing._count.questions === 0) {
      return NextResponse.json({ error: "Sualsız testi dərc etmək olmaz" }, { status: 400 });
    }

    // Sual bankı və aylıq sınaq
    const bank: { isBank?: boolean; drawEasy?: number; drawMedium?: number; drawHard?: number; isMonthly?: boolean } = {};
    if (body.isBank !== undefined) bank.isBank = !!body.isBank;
    for (const k of ["drawEasy", "drawMedium", "drawHard"] as const) {
      if (body[k] !== undefined) {
        const n = drawNum(body[k]);
        if (n === undefined) return NextResponse.json({ error: "Sual sayı rəqəm olmalıdır" }, { status: 400 });
        bank[k] = n;
      }
    }
    if (body.isMonthly !== undefined) bank.isMonthly = !!body.isMonthly;
    const finalBank = bank.isBank ?? existing.isBank;
    const finalMonthly = bank.isMonthly ?? existing.isMonthly;
    if (finalBank) {
      const total = (bank.drawEasy ?? existing.drawEasy) + (bank.drawMedium ?? existing.drawMedium) + (bank.drawHard ?? existing.drawHard);
      if (total < 1) return NextResponse.json({ error: "Testdə ən azı bir sual olmalıdır" }, { status: 400 });
      if (finalMonthly) return NextResponse.json({ error: "Sual bankı aylıq sınaq ola bilməz" }, { status: 400 });
    }
    const finalVis = vis ?? existing.visibility;
    const finalPub = pub ?? existing.isPublished;
    if (finalMonthly && finalPub && finalVis === "PUBLIC") {
      return NextResponse.json({ error: "Aylıq sınaq yalnız seçilmiş qruplara açıq ola bilər" }, { status: 400 });
    }

    // Mövzular: yalnız sahib müəllimin mövzuları
    let topicIds: string[] | undefined;
    if (Array.isArray(body.topicIds)) {
      const ids: string[] = [...new Set<string>((body.topicIds as unknown[]).filter((x): x is string => typeof x === "string"))].slice(0, 100);
      const own = await prisma.topic.count({ where: { id: { in: ids }, teacherId: ownerId } });
      if (own !== ids.length) return forbidden();
      topicIds = ids;
    }

    const pkg = await prisma.$transaction(async (tx) => {
      // Qrup bağlantıları yalnız siyahı göndərildikdə yenilənir
      if (linkIds) {
        await tx.testPackageGroup.deleteMany({ where: { packageId: id } });
      }
      if (topicIds) {
        await tx.topicTest.deleteMany({ where: { packageId: id, topicId: { notIn: topicIds } } });
        const have = new Set((await tx.topicTest.findMany({ where: { packageId: id }, select: { topicId: true } })).map((t) => t.topicId));
        const add = topicIds.filter((t) => !have.has(t));
        if (add.length) await tx.topicTest.createMany({ data: add.map((topicId) => ({ topicId, packageId: id, order: 999 })) });
      }
      return tx.testPackage.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(pub !== undefined && { isPublished: pub }),
          ...(open !== undefined && { isPublic: open }),
          ...(isTimed !== undefined && { isTimed, ...(isTimed ? {} : { duration: null }) }),
          ...(duration !== undefined && isTimed !== false && { duration }),
          ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
          ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
          ...(vis !== undefined && { visibility: vis }),
          ...(allowRetry !== undefined && { allowRetry }),
          ...(shareAnswers !== undefined && { shareAnswers: !!shareAnswers }),
          ...bank,
          // Bankda təkrar həmişə açıqdır, başqasının cavabına baxmaq isə olmur
          ...(finalBank ? { allowRetry: true, shareAnswers: false } : {}),
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
