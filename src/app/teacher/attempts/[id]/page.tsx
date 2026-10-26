"use client";

import { useParams } from "next/navigation";
import AttemptReview from "@/components/AttemptReview";

export default function TeacherAttemptPage() {
  const { id } = useParams<{ id: string }>();
  return <AttemptReview id={id} back="/teacher/attempts" viewer="teacher" />;
}
