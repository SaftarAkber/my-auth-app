import { redirect } from "next/navigation";

// Köhnə /dashboard ünvanı — rola uyğun səhifəyə yönləndirir
export default function DashboardPage() {
  redirect("/");
}
