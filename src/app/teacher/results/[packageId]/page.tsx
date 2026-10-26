"use client";

import { useParams } from "next/navigation";
import ResultsMatrix from "@/components/ResultsMatrix";

export default function TeacherResultsPage() {
  const { packageId } = useParams<{ packageId: string }>();
  return <ResultsMatrix packageId={packageId} back="/teacher/attempts" attemptBase="/teacher/attempts" />;
}
