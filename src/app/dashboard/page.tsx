import { redirect } from "next/navigation";

// /dashboard admin panelin ikinci ünvanıdır
export default function DashboardPage() {
  redirect("/admin");
}
