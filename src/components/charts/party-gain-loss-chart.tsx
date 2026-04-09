"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyBalance } from "@/lib/analytics/elections";

interface PartyGainLossChartProps {
  balances: PartyBalance[];
  title?: string;
}

export function PartyGainLossChart({
  balances,
  title = "Saldo de Desempenho Partidário",
}: PartyGainLossChartProps) {
  // Sort by delta (descending: gains first, then losses)
  const data = [...balances]
    .sort((a, b) => b.delta - a.delta)
    .filter((item) => item.delta !== 0) // Only show parties that actually changed
    .slice(0, 15); // Show top 15 changes to keep it readable

  return (
    <Card className="border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</CardTitle>
        <p className="text-xs text-zinc-500">Net gain/loss de municípios por legenda</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 30)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={false}
              stroke="#e4e4e7"
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="party"
              type="category"
              tick={{ fontSize: 10, fill: "#3f3f46", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as PartyBalance;
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">{data.party}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-blue-600">
                          {data.delta > 0 ? `+${data.delta}` : data.delta} municípios
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          De {data.previousCount} para {data.currentCount}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: "rgba(0,0,0,0.02)" }}
            />
            <ReferenceLine x={0} stroke="#d4d4d8" />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.delta > 0 ? "#10b981" : "#f43f5e"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
