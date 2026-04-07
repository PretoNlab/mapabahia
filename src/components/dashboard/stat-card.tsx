"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-600 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          {icon && (
            <div className="text-zinc-400 dark:text-zinc-600">{icon}</div>
          )}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        {subtitle && (
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            {trend === "up" && (
              <span className="inline-block h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent border-b-emerald-500" />
            )}
            {trend === "down" && (
              <span className="inline-block h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-red-500" />
            )}
            <span
              className={cn(
                trend === "up" && "text-emerald-600",
                trend === "down" && "text-red-500",
                !trend && "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
