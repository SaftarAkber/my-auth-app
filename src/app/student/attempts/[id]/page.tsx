"use client";

import { useParams } from "next/navigation";
import AttemptReview from "@/components/AttemptReview";

export default function StudentAttemptPage() {
  const { id } = useParams<{ id: string }>();
  return <AttemptReview id={id} back="/student/my-tests" />;
}
