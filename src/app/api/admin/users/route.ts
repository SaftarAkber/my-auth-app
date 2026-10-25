import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError } from "@/lib/guards";

// Qeydiyyatdan keçən hər kəs
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
    const role = url.searchParams.get("role");

    const users = await prisma.user.findMany({
      where: {
        ...(role === "STUDENT" || role === "TEACHER" || role === "ADMIN" ? { role } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true, name: true, phone: true, email: true, role: true, bio: true, photo: true,
        coinBalance: true, createdAt: true,
        _count: { select: { groups: true, groupMembers: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const [teachers, students, admins] = await Promise.all([
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
    ]);

    return NextResponse.json({ users, totals: { all: teachers + students + admins, teachers, students, admins } });
  } catch (error) {
    return serverError(error);
  }
}
