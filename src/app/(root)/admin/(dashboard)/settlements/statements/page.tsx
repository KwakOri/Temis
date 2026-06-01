import RoyaltyStatementManagement from "@/components/admin/RoyaltyStatementManagement";

interface SettlementStatementPageProps {
  searchParams?: Promise<{
    artistId?: string;
    batchId?: string;
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
      initialBatchId={params?.batchId || null}
      initialMonth={params?.month || null}
    />
  );
}
