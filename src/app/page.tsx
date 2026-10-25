import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AUTH_COOKIE } from "@/lib/config";
import { getSiteContent } from "@/lib/site";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

const HOME = { TEACHER: "/teacher", ADMIN: "/admin", STUDENT: "/student" } as const;

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(HOME[currentUser.role]);

  // Cookie var, amma hesab yoxdur (silinib / token köhnəlib): cookie təmizlənir, əks halda /login dövrəyə düşür
  if ((await cookies()).get(AUTH_COOKIE)?.value) redirect("/api/auth/reset");

  // Giriş etməmişlər üçün ana səhifə: məzmun admin panelindən idarə olunur
  return <Landing site={await getSiteContent()} />;
}
