"use client";

import TopicList from "@/components/topics/TopicList";

/** Müəllimin bütün mövzuları bir yerdə (qruplardan asılı olmayaraq) */
export default function TeacherTopicsPage() {
  return (
    <div className="page">
      <TopicList />
    </div>
  );
}
