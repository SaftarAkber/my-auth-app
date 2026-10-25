import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSiteContent } from "@/lib/site";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

const HOME = { TEACHER: "/teacher", ADMIN: "/admin", STUDENT: "/student" } as const;

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(HOME[currentUser.role]);

  // Giriş etməmişlər üçün ana səhifə: məzmun admin panelindən idarə olunur
  return <Landing site={await getSiteContent()} />;
}
