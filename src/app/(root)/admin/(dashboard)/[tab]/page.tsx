"use client";

import AccessManagement from "@/components/admin/AccessManagement";
import ArtistManagement from "@/components/admin/ArtistManagement";
import CustomOrderManagement from "@/components/admin/CustomOrderManagement";
import { DeadlineCalendarView } from "@/components/admin/DeadlineCalendar";
import EmailTemplatePreview from "@/components/admin/EmailTemplatePreview";
import PortfolioManagement from "@/components/admin/PortfolioManagement";
import PurchaseManagement from "@/components/admin/PurchaseManagement";
import SalesStatsManagement from "@/components/admin/SalesStatsManagement";
import SettingsManagement from "@/components/admin/SettingsManagement";
import TeamManagement from "@/components/admin/TeamManagement";
import TeamTemplateManagement from "@/components/admin/TeamTemplateManagement";
import TemplateManagement from "@/components/admin/TemplateManagement";
import ThumbnailManagement from "@/components/admin/ThumbnailManagement";
import UserManagement from "@/components/admin/UserManagement";
import Loading from "@/components/Loading";
import {
  ADMIN_DEFAULT_TAB_ID,
  getAdminPathByTabId,
  getAdminTabIdBySegment,
} from "@/lib/adminTabs";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminTabPage() {
  const params = useParams<{ tab: string }>();
  const router = useRouter();
  const tab = typeof params.tab === "string" ? params.tab : "";
  const tabId = getAdminTabIdBySegment(tab);

  useEffect(() => {
    if (tabId) {
      return;
    }

    router.replace(getAdminPathByTabId(ADMIN_DEFAULT_TAB_ID));
  }, [router, tabId]);

  if (!tabId) {
    return <Loading />;
  }

  switch (tabId) {
    case "workCalendar":
      return <DeadlineCalendarView />;
    case "customOrders":
      return <CustomOrderManagement />;
    case "purchases":
      return <PurchaseManagement />;
    case "salesStats":
      return <SalesStatsManagement />;
    case "templates":
      return <TemplateManagement />;
    case "artists":
      return <ArtistManagement />;
    case "thumbnails":
      return <ThumbnailManagement />;
    case "portfolios":
      return <PortfolioManagement />;
    case "access":
      return <AccessManagement />;
    case "users":
      return <UserManagement />;
    case "teams":
      return <TeamManagement />;
    case "teamTemplates":
      return <TeamTemplateManagement />;
    case "emailPreview":
      return <EmailTemplatePreview />;
    case "settings":
      return <SettingsManagement />;
    default:
      return <Loading />;
  }
}
