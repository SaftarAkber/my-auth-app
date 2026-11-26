import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/guards";

// Qrupun üzvləri (yalnız qrupun müəllimi) – məs. tapşırıqdan azad ediləcək tələbələri seçmək üçün
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const group = await prisma.group.findUnique({ where: { id }, select: { teacherId: true } });
    if (!group) return notFound();
    if (group.teacherId !== user.id && user.role !== "ADMIN") return forbidden();
    const members = await prisma.groupMember.findMany({
      where: { groupId: id, student: { deletedAt: null } },
      select: { student: { select: { id: true, name: true, photo: true } } },
      orderBy: { student: { name: "asc" } },
    });
    return NextResponse.json({ members: members.map((m) => m.student) });
  } catch (error) {
    return serverError(error);
  }
}

// Qrupdan çıxar: müəllim istənilən üzvü silə bilər, tələbə yalnız özü çıxa bilər
// DELETE /api/groups/:id/members?studentId=...   (tələbə üçün studentId verilməsə özü çıxır)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const { id: groupId } = await params;
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group) return notFound("Qrup tapılmadı");

    const queryStudent = new URL(req.url).searchParams.get("studentId");
    const studentId = currentUser.role === "TEACHER" ? queryStudent : currentUser.id;
    if (!studentId) return NextResponse.json({ error: "Tələbə seçilməyib" }, { status: 400 });

    if (currentUser.role === "TEACHER" && group.teacherId !== currentUser.id) return forbidden();

    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { groupId, studentId } }),
      // Yenidən müraciət edə bilməsi üçün köhnə sorğunu da təmizləyirik
      prisma.enrollmentRequest.deleteMany({ where: { groupId, studentId } }),
    ]);

    return NextResponse.json({ message: "Qrupdan çıxarıldı" });
  } catch (error) {
    return serverError(error);
  }
}
