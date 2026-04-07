"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComparisonBarProps {
  title: string;
  items: Array<{
    label: string;
    value: number;
    maxValue: number;
    color: string;
    formattedValue: string;
  }>;
}

export function ComparisonBar({ title, items }: ComparisonBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums">
                  {item.formattedValue}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((item.value / item.maxValue) * 100, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
