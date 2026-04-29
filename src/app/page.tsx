import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { role: true },
  });

  if (user?.role === "TEACHER") redirect("/teacher");
  else redirect("/student");
}