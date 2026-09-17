"use client";
import { isPublicSiteHostname } from "@/lib/site-hostname";
import type { DecisionEventName, DecisionEventPayload } from "@/lib/analytics-events";
function journeyId() {
  const key = "bt_decision_journey";
  try {
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem(key, value);
    }
    return value;
  }
  catch {
    return crypto.randomUUID();
  }
}
export function trackDecisionEvent(eventName: DecisionEventName, details: Omit<DecisionEventPayload, "eventName" | "journeyId"> = {}) {
  if (typeof window === "undefined" || !isPublicSiteHostname(window.location.hostname))
    return;
  const body = JSON.stringify({
    eventName, journeyId: journeyId(), ...details
  });
  void fetch("/api/analytics", {
    method: "POST", headers: {
      "content-type": "application/json"
    }, body, keepalive: true
  }).catch(() => { });
}
