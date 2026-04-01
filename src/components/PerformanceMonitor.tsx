"use client";

import { useReportWebVitals } from "next/web-vitals";

function sendMetric(metric: {
  id: string;
  name: string;
  label: string;
  value: number;
  navigationType: string;
  rating?: string;
}) {
  const body = JSON.stringify({
    ...metric,
    path: window.location.pathname,
    search: window.location.search,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/monitoring/web-vitals",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  void fetch("/api/monitoring/web-vitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export default function PerformanceMonitor() {
  useReportWebVitals((metric) => {
    sendMetric({
      id: metric.id,
      name: metric.name,
      label: metric.label,
      value: metric.value,
      navigationType: metric.navigationType,
      rating: metric.rating,
    });
  });

  return null;
}
