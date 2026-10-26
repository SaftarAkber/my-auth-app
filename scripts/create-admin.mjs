// İstifadə:  npm run create-admin -- <istifadəçi_adı>
//   Parol gizli sorğu ilə soruşulur (ekranda və shell tarixçəsində görünmür).
//   Avtomatlaşdırma üçün ADMIN_PASSWORD mühit dəyişəni də işləyir.
// Admin hesabı telefon/email olmadan, yalnız istifadəçi adı + parolla yaranır.
// Adi hesablar və axtarış onu görmür. Hesab varsa, parolu yenilənir və rol ADMIN olur.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  /* .env yoxdursa mühit dəyişənləri istifadə olunur */
}

const username = (process.argv[2] ?? "").trim();
if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
  console.error("İstifadəçi adı 3–40 simvol olmalıdır (hərf, rəqəm, nöqtə, tire, alt xətt; boşluq və @ olmaz).");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      // boru ilə verilibsə: bir sətir oxu
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (c) => (data += c));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

const password = process.env.ADMIN_PASSWORD ?? (await askHidden("Parol (ən az 8 simvol): "));
if (password.length < 8) {
  console.error("Parol ən az 8 simvol olmalıdır.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const hash = await bcrypt.hash(password, 12);
  // İstifadəçi adı phone sütununda saxlanılır (adi telefonlar həmişə "+" ilə başlayır, toqquşma olmur)
  const existing = await prisma.user.findFirst({ where: { phone: { equals: username, mode: "insensitive" } } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { password: hash, role: "ADMIN" } });
    console.log(`"${existing.phone}" admin hesabı yeniləndi.`);
  } else {
    await prisma.user.create({
      data: { name: username, phone: username, password: hash, role: "ADMIN", coinBalance: 0 },
    });
    console.log(`"${username}" admin hesabı yaradıldı.`);
  }
  console.log("Giriş: saytda /admin (və ya /dashboard) ünvanında istifadəçi adı və parolla daxil olun.");
} finally {
  await prisma.$disconnect();
}
