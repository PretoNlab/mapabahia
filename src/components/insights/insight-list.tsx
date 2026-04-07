"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightListProps {
  title: string;
  insights: string[];
}

export function InsightList({ title, insights }: InsightListProps) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                {i + 1}
              </span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
