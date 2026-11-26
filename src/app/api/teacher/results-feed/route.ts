import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTeacher, serverError } from "@/lib/guards";

/**
 * Müəllim: bütün nəticələr (hər cəhd ayrıca, ən yeni yuxarıda) – axtarış və filtrlər.
 * GET /api/teacher/results-feed?q=&period=&min=&max=&groups=a,b&type=bank|static|monthly&packageId=&topicId=
 *     &status=pending|nocomment|nocoin&fast=1&offset=0&meta=1&format=csv
 */
const PAGE = 30;
const MAX_ROWS = 5000;
const PERIOD_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, "6m": 183, "1y": 365, "2y": 730 };

/** "Çox tez bitirib": ≤40 dəq test → vaxtının yarısından tez; 40–60 dəq → 25 dəq-dən tez; 60+ → 30 dəq-dən tez */
function fastLimitSec(durationSec: number | null, isTimed: boolean) {
  if (!isTimed || !durationSec) return null;
  const m = durationSec / 60;
  return (m <= 40 ? m / 2 : m <= 60 ? 25 : 30) * 60;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const me = auth.user.id;
    const sp = req.nextUrl.searchParams;

    const myGroups = await prisma.group.findMany({ where: { teacherId: me }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    const owned: Prisma.TestPackageWhereInput = {
      OR: [{ collection: { teacherId: me } }, { group: { teacherId: me } }, { testPackageGroups: { some: { group: { teacherId: me } } } }],
    };

    const q = (sp.get("q") ?? "").trim().slice(0, 80);
    const period = sp.get("period") ?? "";
    const min = Math.max(0, Math.min(100, Number(sp.get("min") ?? 0) || 0));
    const max = Math.max(0, Math.min(100, sp.get("max") === null ? 100 : Number(sp.get("max"))));
    const groups = (sp.get("groups") ?? "").split(",").filter((g) => myGroups.some((x) => x.id === g));
    const type = sp.get("type") ?? "";
    const packageId = sp.get("packageId") ?? "";
    const topicId = sp.get("topicId") ?? "";
    const status = sp.get("status") ?? "";
    const fast = sp.get("fast") === "1";
    const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
    const csv = sp.get("format") === "csv";

    const pkgWhere: Prisma.TestPackageWhereInput = {
      AND: [
        owned,
        type === "bank" ? { isBank: true } : type === "monthly" ? { isMonthly: true } : type === "static" ? { isBank: false, isMonthly: false } : {},
        packageId ? { id: packageId } : {},
        topicId ? { topicTests: { some: { topicId } } } : {},
      ],
    };
    const days = PERIOD_DAYS[period];
    const where: Prisma.StudentAttemptWhereInput = {
      finishedAt: { not: null, ...(days ? { gte: new Date(Date.now() - days * 86400e3) } : {}) },
      package: pkgWhere,
      ...(groups.length ? { student: { groupMembers: { some: { groupId: { in: groups } } } } } : {}),
      ...(q
        ? {
            OR: [
              { student: { name: { contains: q, mode: "insensitive" } } },
              { package: { name: { contains: q, mode: "insensitive" } } },
              { student: { groupMembers: { some: { group: { teacherId: me, name: { contains: q, mode: "insensitive" } } } } } },
            ],
          }
        : {}),
      ...(status === "pending" ? { answers: { some: { status: "PENDING" } } } : {}),
      ...(status === "nocomment" ? { reviewComments: { none: {} } } : {}),
    };

    const rows = await prisma.studentAttempt.findMany({
      where,
      orderBy: { finishedAt: "desc" },
      take: MAX_ROWS,
      select: {
        id: true, score: true, totalScore: true, startedAt: true, finishedAt: true, rewardGranted: true, rewardCoins: true,
        student: { select: { id: true, name: true, photo: true, deletedAt: true, groupMembers: { where: { group: { teacherId: me } }, select: { group: { select: { id: true, name: true } } } } } },
        package: { select: { id: true, name: true, isBank: true, isMonthly: true, isTimed: true, duration: true, rewardEnabled: true, rewardMinCorrect: true } },
        _count: { select: { answers: { where: { status: "PENDING" } }, reviewComments: true } },
      },
    });

    const items = rows
      .map((r) => {
        const pct = r.totalScore ? Math.round(((r.score ?? 0) / r.totalScore) * 100) : 0;
        const durationSec = Math.max(0, Math.round((r.finishedAt!.getTime() - r.startedAt.getTime()) / 1000));
        const limit = fastLimitSec(r.package.duration, r.package.isTimed);
        const coinDue = r.package.rewardEnabled && r.package.rewardMinCorrect != null && (r.score ?? 0) >= r.package.rewardMinCorrect && !r.rewardGranted && r._count.answers === 0;
        const g = r.student.groupMembers.map((m) => m.group);
        return {
          id: r.id,
          student: { id: r.student.id, name: r.student.name, photo: r.student.photo, deleted: !!r.student.deletedAt },
          groups: groups.length ? g.filter((x) => groups.includes(x.id)) : g,
          package: { id: r.package.id, name: r.package.name, type: r.package.isMonthly ? "monthly" : r.package.isBank ? "bank" : "static", durationSec: r.package.isTimed ? r.package.duration : null },
          score: r.score ?? 0,
          total: r.totalScore ?? 0,
          pct,
          finishedAt: r.finishedAt!,
          durationSec,
          fast: limit !== null && durationSec < limit,
          pending: r._count.answers,
          commented: r._count.reviewComments > 0,
          coinDue,
          rewardCoins: r.rewardGranted ? r.rewardCoins : 0,
        };
      })
      .filter((x) => x.pct >= min && x.pct <= max)
      .filter((x) => (status === "nocoin" ? x.coinDue : true))
      .filter((x) => (fast ? x.fast : true));

    if (csv) {
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const fmt = (d: Date) => new Date(d.getTime() + 4 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
      const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      const lines = [
        ["Tələbə", "Qrup", "Test", "Növ", "Düz", "Ümumi", "Faiz", "Tarix (Bakı)", "Müddət (dəq:san)", "Yoxlanmalı", "Çox tez"].map(esc).join(";"),
        ...items.map((x) =>
          [
            x.student.name, x.groups.map((g) => g.name).join(", "), x.package.name,
            x.package.type === "bank" ? "Bank" : x.package.type === "monthly" ? "Aylıq" : "Adi",
            x.score, x.total, x.pct, fmt(x.finishedAt), mmss(x.durationSec), x.pending || "", x.fast ? "bəli" : "",
          ].map(esc).join(";"),
        ),
      ];
      // BOM – Excel Azərbaycan hərflərini düzgün göstərsin
      return new NextResponse("﻿" + lines.join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="neticeler-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const meta =
      sp.get("meta") === "1"
        ? {
            groups: myGroups,
            packages: await prisma.testPackage.findMany({ where: { ...owned, deletedAt: null }, select: { id: true, name: true, isBank: true, isMonthly: true }, orderBy: { name: "asc" } }),
            topics: await prisma.topic.findMany({ where: { teacherId: me }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
          }
        : undefined;

    return NextResponse.json({
      items: items.slice(offset, offset + PAGE),
      total: items.length,
      truncated: rows.length === MAX_ROWS,
      nextOffset: offset + PAGE < items.length ? offset + PAGE : null,
      meta,
    });
  } catch (error) {
    return serverError(error);
  }
}
