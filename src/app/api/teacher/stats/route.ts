import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const [students, videos, packages, attempts, pendingRequests, groups] = await Promise.all([
      prisma.groupMember.count({
        where: { group: { teacherId: currentUser.id } },
      }),
      prisma.video.count({
        where: { teacherId: currentUser.id, isActive: true },
      }),
      prisma.testPackage.count({
        where: {
          isPublished: true,
          OR: [
            { collection: { teacherId: currentUser.id } },
            { group: { teacherId: currentUser.id } },
          ],
        },
      }),
      prisma.studentAttempt.count({
        where: {
          package: {
            OR: [
              { collection: { teacherId: currentUser.id } },
              { group: { teacherId: currentUser.id } },
            ],
          },
          finishedAt: { not: null },
        },
      }),
      prisma.enrollmentRequest.count({
        where: { teacherId: currentUser.id, status: "PENDING" },
      }),
      prisma.group.count({
        where: { teacherId: currentUser.id },
      }),
    ]);

    return NextResponse.json({ students, videos, packages, attempts, pendingRequests, groups });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}