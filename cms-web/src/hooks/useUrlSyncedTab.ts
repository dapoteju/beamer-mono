import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

export type CampaignTab = "overview" | "flights" | "creatives" | "reporting";

export function useUrlSyncedTab(defaultTab: CampaignTab = "overview"): [CampaignTab, (tab: CampaignTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const tabParam = searchParams.get("tab");
  const activeTab: CampaignTab = 
    tabParam && ["overview", "flights", "creatives", "reporting"].includes(tabParam)
      ? (tabParam as CampaignTab)
      : defaultTab;

  const setActiveTab = useCallback((tab: CampaignTab) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === defaultTab) {
      newParams.delete("tab");
    } else {
      newParams.set("tab", tab);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, defaultTab]);

  return [activeTab, setActiveTab];
}
