"use client";

import { PageHeader } from "@/components/ui";
import StudentAssignments from "@/components/StudentAssignments";

export default function StudentAssignmentsPage() {
  return (
    <div className="page-narrow">
      <PageHeader title="Tapşırıqlar" subtitle="Müəllimlərin verdiyi ev tapşırıqları" />
      <StudentAssignments />
    </div>
  );
}
