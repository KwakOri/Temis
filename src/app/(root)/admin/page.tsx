import {
  ADMIN_DEFAULT_TAB_ID,
  getAdminPathByTabId,
  getAdminTabIdFromQuery,
} from "@/lib/adminTabs";
import { redirect } from "next/navigation";

interface AdminEntryPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function AdminEntryPage({
  searchParams,
}: AdminEntryPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const queryTab = resolvedSearchParams?.tab;
  const tabId = getAdminTabIdFromQuery(queryTab) || ADMIN_DEFAULT_TAB_ID;

  redirect(getAdminPathByTabId(tabId));
}
