import ShopSoon from "@/components/ShopSoon";
import { PageHeader } from "@/components/ui";

export default function MarketPage() {
  return (
    <div className="page">
      <PageHeader title="Mağaza" subtitle="Coinlə alınan hədiyyələr" />
      <ShopSoon />
    </div>
  );
}
