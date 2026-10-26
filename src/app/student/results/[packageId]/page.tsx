"use client";

import { useParams } from "next/navigation";
import ResultsMatrix from "@/components/ResultsMatrix";

export default function StudentResultsPage() {
  const { packageId } = useParams<{ packageId: string }>();
  return <ResultsMatrix packageId={packageId} back="/student/my-tests" attemptBase="/student/attempts" />;
}
