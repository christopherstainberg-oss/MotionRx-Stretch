"use client";

import { useEffect, useState } from "react";
import { TodayRecoveryDashboard } from "@/components/TodayRecoveryDashboard";
import { loadLocalPainProfile } from "@/lib/pain-profile";

export function HomeTodaySection() {
  const [surgeryId, setSurgeryId] = useState<string | undefined>();
  const [surgeryDate, setSurgeryDate] = useState<string | undefined>();
  const [precautionIds, setPrecautionIds] = useState<string[] | undefined>();

  useEffect(() => {
    const p = loadLocalPainProfile();
    if (p?.surgeryId) setSurgeryId(p.surgeryId);
    if (p?.surgeryDate) setSurgeryDate(p.surgeryDate);
    if (p?.precautionIds) setPrecautionIds(p.precautionIds);
  }, []);

  return (
    <TodayRecoveryDashboard
      surgeryId={surgeryId}
      surgeryDate={surgeryDate}
      precautionIds={precautionIds}
    />
  );
}
