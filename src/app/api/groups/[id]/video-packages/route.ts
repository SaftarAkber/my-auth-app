import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroup } from "@/lib/guards";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id: groupId } = await params;
    if (!(await teacherOwnsGroup(auth.user.id, groupId))) return forbidden();

    const { name, description, collectionId } = await req.json();
    if (!name) return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });

    if (collectionId) {
      const col = await prisma.collection.findFirst({ where: { id: collectionId, teacherId: auth.user.id } });
      if (!col) return forbidden();
    }

    const pkg = await prisma.videoPackage.create({
      data: {
        name,
        description: description || null,
        groupId,
        teacherId: auth.user.id,
        collectionId: collectionId || null,
      },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
