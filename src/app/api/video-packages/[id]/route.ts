import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  requireTeacher,
  serverError,
  teacherOwnsGroups,
  teacherOwnsVideoPackage,
} from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    if (!(await teacherOwnsVideoPackage(auth.user.id, id))) return forbidden();

    const { name, description, isPublished, isPublic, visibility, groupIds } = await req.json();

    if (Array.isArray(groupIds) && !(await teacherOwnsGroups(auth.user.id, groupIds))) {
      return forbidden();
    }

    const pkg = await prisma.$transaction(async (tx) => {
      // Qrup bağlantıları yalnız siyahı göndərildikdə yenilənir
      if (Array.isArray(groupIds)) {
        await tx.videoPackageGroup.deleteMany({ where: { packageId: id } });
      }
      return tx.videoPackage.update({
        where: { id },
        data: {
          // Sahibi olmayan köhnə paketləri bu müəllimə bağla
          teacherId: auth.user.id,
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isPublished !== undefined && { isPublished }),
          ...(isPublic !== undefined && { isPublic }),
          ...(visibility !== undefined && { visibility }),
          ...(Array.isArray(groupIds) && groupIds.length
            ? { videoPackageGroups: { create: groupIds.map((groupId: string) => ({ groupId })) } }
            : {}),
        },
        include: { videoPackageGroups: { include: { group: { select: { id: true, name: true } } } } },
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
    if (!(await teacherOwnsVideoPackage(auth.user.id, id))) return forbidden();

    await prisma.videoPackage.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
