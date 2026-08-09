import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER" } });
  for (const t of teachers) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: t.id }, data: { coinBalance: { increment: 500 } } }),
      prisma.coinTransaction.create({
        data: { userId: t.id, amount: 500, type: "INITIAL_GRANT", reason: "İlk dağıtım" },
      }),
    ]);
  }
  console.log(`${teachers.length} müəllimə 500 coin verildi`);
}
main().finally(() => prisma.$disconnect());