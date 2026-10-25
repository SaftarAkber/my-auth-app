"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/ui";

// Müəllimin səhifəsi artıq ümumi profil səhifəsidir
export default function TeacherProfileRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/u/${id}`);
  }, [id, router]);
  return <FullPageLoader />;
}
