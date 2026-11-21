import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      bio: true,
      photo: true,
      coinBalance: true,
      tokenVersion: true,
      deletedAt: true,
    },
  });

  // Silinmiş hesab və ya şifrə dəyişəndən əvvəlki token (başqa cihazdakı köhnə giriş) qəbul olunmur
  if (!user || user.deletedAt || (payload.tv ?? 0) !== user.tokenVersion) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenVersion, deletedAt, ...rest } = user;
  return rest;
}