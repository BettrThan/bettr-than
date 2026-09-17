"use client";

import { useEffect } from "react";
import { trackDecisionEvent } from "@/lib/analytics-client";
import type { DecisionEventName, DecisionEventPayload } from "@/lib/analytics-events";

export function DecisionAnalyticsView({ eventName, details = {} }: { eventName: DecisionEventName; details?: Omit<DecisionEventPayload, "eventName" | "journeyId"> }) {
  const signature = JSON.stringify([eventName, details]);
  useEffect(() => {
    const key = `bt_event:${signature}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* Storage may be disabled; analytics must never break the page. */ }
    trackDecisionEvent(eventName, details);
  }, [details, eventName, signature]);
  return null;
}
