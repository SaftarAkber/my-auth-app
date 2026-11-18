import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroups } from "@/lib/guards";

/**
 * Paylaşımı bir və ya bir neçə qrupa göndərir. Hər qrup üçün ayrıca sətir yazılır (eyni createdAt ilə),
 * belə ki hər qrup səhifəsi öz paylaşımını görür, profil və lent isə onları bir kartda birləşdirir (lib/posts.ts).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { groupIds, content, images, visibility } = await req.json();
    const ids: string[] = Array.isArray(groupIds) ? [...new Set(groupIds.filter((x: unknown) => typeof x === "string"))] as string[] : [];
    if (ids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
    if (ids.length > 50) return NextResponse.json({ error: "Çox qrup seçilib" }, { status: 400 });
    const text = String(content ?? "").trim();
    if (!text) return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });
    if (!(await teacherOwnsGroups(auth.user.id, ids))) return forbidden();

    const urls: string[] = Array.isArray(images) ? images.filter((u: unknown) => typeof u === "string").slice(0, 4) : [];
    const createdAt = new Date();
    const vis = visibility === "PUBLIC" ? "PUBLIC" : "GROUP";

    await prisma.$transaction(
      ids.map((groupId) =>
        prisma.groupPost.create({
          data: {
            content: text,
            groupId,
            teacherId: auth.user.id,
            visibility: vis,
            createdAt,
            images: urls.length ? { create: urls.map((url) => ({ url })) } : undefined,
          },
        }),
      ),
    );

    return NextResponse.json({ count: ids.length }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
