import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InsufficientCoins, transferCoins } from "@/lib/coins";
import { ownerTeacherId } from "@/lib/rewards";
import { forbidden, notFound, requireTeacher, serverError } from "@/lib/guards";

// Müəllim öz balansından tələbəyə coin hədiyyə edir.
// attemptId verilərsə, həmin test nəticəsi üçün mükafat kimi qeyd olunur.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const teacher = auth.user;

    const body = await req.json();
    const studentId = String(body.studentId ?? "");
    const amount = Math.floor(Number(body.amount));
    const reason = body.reason ? String(body.reason).trim().slice(0, 200) : undefined;
    const attemptId = body.attemptId ? String(body.attemptId) : null;

    if (!studentId) return NextResponse.json({ error: "Tələbə seçilməyib" }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
      return NextResponse.json({ error: "Coin sayı 1 ilə 100000 arasında olmalıdır" }, { status: 400 });
    }

    // Yalnız öz qruplarının üzvlərinə
    const member = await prisma.groupMember.findFirst({
      where: { studentId, group: { teacherId: teacher.id } },
      select: { id: true },
    });
    if (!member) return forbidden();

    if (attemptId) {
      const attempt = await prisma.studentAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, studentId: true, packageId: true, rewardGranted: true, finishedAt: true },
      });
      if (!attempt || attempt.studentId !== studentId || !attempt.finishedAt) return notFound("Nəticə tapılmadı");
      if ((await ownerTeacherId(attempt.packageId)) !== teacher.id) return forbidden();
      if (attempt.rewardGranted) {
        return NextResponse.json({ error: "Bu nəticə üçün mükafat artıq verilib" }, { status: 409 });
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        if (attemptId) {
          const marked = await tx.studentAttempt.updateMany({
            where: { id: attemptId, rewardGranted: false },
            data: { rewardGranted: true, rewardCoins: amount },
          });
          if (marked.count === 0) throw new Error("ALREADY");
        }
        await transferCoins({
          fromId: teacher.id,
          toId: studentId,
          amount,
          reason: reason ?? (attemptId ? "Test mükafatı" : "Müəllimdən hədiyyə"),
          receivedType: attemptId ? "TEST_REWARD" : "GIFT_RECEIVED",
          tx,
        });
      });
    } catch (e) {
      if (e instanceof InsufficientCoins) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      if (e instanceof Error && e.message === "ALREADY") {
        return NextResponse.json({ error: "Bu nəticə üçün mükafat artıq verilib" }, { status: 409 });
      }
      throw e;
    }

    const me = await prisma.user.findUnique({ where: { id: teacher.id }, select: { coinBalance: true } });
    return NextResponse.json({ balance: me?.coinBalance ?? 0 });
  } catch (error) {
    return serverError(error);
  }
}
