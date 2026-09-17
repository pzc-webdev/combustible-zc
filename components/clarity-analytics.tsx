"use client";

import Clarity from "@microsoft/clarity";
import { useEffect, useRef } from "react";

export function ClarityAnalytics() {
  const initialized = useRef(false);

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

    if (process.env.NODE_ENV !== "production" || !projectId || initialized.current) {
      return;
    }

    Clarity.init(projectId);
    initialized.current = true;
  }, []);

  return null;
}
