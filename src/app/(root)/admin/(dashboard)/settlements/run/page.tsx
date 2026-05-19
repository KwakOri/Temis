import RoyaltySettlementRunManagement from "@/components/admin/RoyaltySettlementRunManagement";

interface SettlementRunPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

export default async function SettlementRunPage({
  searchParams,
}: SettlementRunPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return <RoyaltySettlementRunManagement initialMonth={params?.month || null} />;
}
