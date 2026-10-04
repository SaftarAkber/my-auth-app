import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, serverError } from "@/lib/guards";

export async function GET() {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const packages = await prisma.testPackage.findMany({
      where: {
        OR: [
          { collection: { teacherId: auth.user.id } },
          { group: { teacherId: auth.user.id } },
        ],
      },
      include: {
        _count: { select: { questions: true, attempts: true } },
        testPackageGroups: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { name, description, collectionId, isTimed, duration, startsAt, endsAt, allowRetry } =
      await req.json();

    if (!name || !collectionId) {
      return NextResponse.json({ error: "Ad və kolleksiya məcburidir" }, { status: 400 });
    }

    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, teacherId: auth.user.id },
      select: { id: true },
    });
    if (!collection) {
      return NextResponse.json({ error: "Kolleksiya tapılmadı" }, { status: 404 });
    }

    if (isTimed && (!duration || duration < 60)) {
      return NextResponse.json({ error: "Vaxt məhdudiyyəti ən azı 1 dəqiqə olmalıdır" }, { status: 400 });
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json({ error: "Bitmə vaxtı başlanğıcdan sonra olmalıdır" }, { status: 400 });
    }

    const pkg = await prisma.testPackage.create({
      data: {
        name,
        description: description || null,
        collectionId,
        isTimed: !!isTimed,
        duration: isTimed ? duration : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        allowRetry: !!allowRetry,
      },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
