"use client";

import { useEffect, useRef } from "react";
import { trackDecisionEvent } from "@/lib/analytics-client";

type DecisionPageEventProps = {
  event: "guide_viewed" | "finder_viewed";
  category: string;
  preset?: string;
};

export function DecisionPageEvent({ event, category, preset }: DecisionPageEventProps) {
  const previous = useRef("");

  useEffect(() => {
    const key = `${event}:${category}:${preset ?? ""}`;
    if (previous.current === key) return;

    previous.current = key;
    trackDecisionEvent(event, { categorySlug: category, presetKey: preset });
  }, [event, category, preset]);

  return null;
}
