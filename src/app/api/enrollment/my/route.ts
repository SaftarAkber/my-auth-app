import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    if (currentUser.role === "TEACHER") {
      // Müəllim üçün bütün müraciətləri gətiririk
      const requests = await prisma.enrollmentRequest.findMany({
        where: { teacherId: currentUser.id },
        include: {
          student: {
            select: { id: true, name: true, photo: true, email: true, phone: true },
          },
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ enrollments: requests });
      
    } else {
      // Tələbə üçün müraciətlər
      const requests = await prisma.enrollmentRequest.findMany({
        where: { studentId: currentUser.id },
        include: {
          group: { select: { id: true, name: true, description: true, schedule: true } },
          teacher: { select: { id: true, name: true, photo: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      
      return NextResponse.json({ enrollments: requests });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}