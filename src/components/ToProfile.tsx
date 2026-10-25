"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/ui";

// Köhnə profil/tənzimləmə ünvanları yeni profil səhifəsinə yönləndirilir
export default function ToProfile({ tab }: { tab?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(`/u/${user.id}${tab ? `?tab=${tab}` : ""}`);
  }, [user, tab, router]);
  return <FullPageLoader />;
}
