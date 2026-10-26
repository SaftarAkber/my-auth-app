// İstifadə: npm run make-admin -- <email və ya +994telefon>
// Mövcud hesabı ADMIN edir (açıq qeydiyyatdan admin yaradıla bilmir).
import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  /* .env yoxdursa mühit dəyişənləri istifadə olunur */
}

const id = (process.argv[2] ?? "").trim();
if (!id) {
  console.error("İstifadə: npm run make-admin -- <email və ya telefon>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const where = id.includes("@") ? { email: id.toLowerCase() } : { phone: id };
  const user = await prisma.user.findFirst({ where, select: { id: true, name: true, role: true } });
  if (!user) {
    console.error(`Hesab tapılmadı: ${id}. Əvvəlcə saytda qeydiyyatdan keçin.`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${user.name} (${user.role} → ADMIN). Admin yalnız /admin (və ya /dashboard) ünvanından daxil olur. Bu hesabın email/telefon parolu ilə.`);
} finally {
  await prisma.$disconnect();
}
