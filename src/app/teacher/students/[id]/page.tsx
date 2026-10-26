import { redirect } from "next/navigation";

// Tələbə təfərrüatı ümumi profil səhifəsinə yönləndirilir
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/u/${id}`);
}
