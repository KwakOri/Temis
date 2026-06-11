import RoyaltyStatementManagement from "@/components/admin/RoyaltyStatementManagement";

interface SettlementStatementPageProps {
  searchParams?: Promise<{
    artistId?: string;
    month?: string;
  }>;
}

export default async function SettlementStatementPage({
  searchParams,
}: SettlementStatementPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <RoyaltyStatementManagement
      initialArtistId={params?.artistId || null}
      initialMonth={params?.month || null}
    />
  );
}
