"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface RankedItem {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  rank: number;
}

interface RankingTableProps {
  title: string;
  items: RankedItem[];
  highlightTop?: number;
}

export function RankingTable({
  title,
  items,
  highlightTop = 3,
}: RankingTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={`${item.id}-${item.rank}`}
              href={`/municipio/${item.id}`}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    item.rank <= highlightTop
                      ? "bg-gradient-to-br from-blue-600 to-emerald-500 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {item.rank}
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                {item.formattedValue}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
