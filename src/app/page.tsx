import { SearchBar } from "@/components/dashboard/search-bar";
import Link from "next/link";
import { Suspense } from "react";
import {
  ElectoralDynamicsContainer,
  OverviewStatsContainer,
  SecondaryStatsContainer,
  ElectionCardsContainer,
  CandidateSpotlightsContainer,
  DisputesContainer,
  InsightsContainer,
  DistributionsContainer,
  RankingsContainer,
} from "@/components/dashboard/data-containers";
import {
  ElectoralDynamicsSkeleton,
  OverviewStatsSkeleton,
  SecondaryStatsSkeleton,
  ElectionCardsSkeleton,
  CandidateSpotlightSkeleton,
  DisputeTableSkeleton,
  InsightsSkeleton,
  DistributionChartsSkeleton,
  RankingsSkeleton,
} from "@/components/dashboard/skeletons";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 px-8 py-10 text-white shadow-lg">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-4xl font-bold tracking-tight">
            Pulso Bahia
          </h1>
          <p className="mt-2 text-lg text-blue-100">
            Inteligencia eleitoral e territorial — Eleicoes Municipais 2024
          </p>
          <div className="mt-6">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Painel de Mudanças (Prioritário) */}
      <Suspense fallback={<ElectoralDynamicsSkeleton />}>
        <ElectoralDynamicsContainer />
      </Suspense>

      {/* Overview Stats */}
      <Suspense fallback={<OverviewStatsSkeleton />}>
        <OverviewStatsContainer />
      </Suspense>

      {/* Secondary Stats */}
      <Suspense fallback={<SecondaryStatsSkeleton />}>
        <SecondaryStatsContainer />
      </Suspense>

      {/* Quick Actions */}
      <div className="mb-10 flex flex-wrap gap-3">
        <Link
          href="/candidatos"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Buscar Candidatos
        </Link>
        <Link
          href="/mapa"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Ver Mapa da Bahia
        </Link>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Rankings Completos
        </Link>
        <Link
          href="/comparacao"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Comparar 2020 x 2024
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
           Painel Admin
        </Link>
      </div>

      {/* Election Cards */}
      <Suspense fallback={<ElectionCardsSkeleton />}>
        <ElectionCardsContainer />
      </Suspense>

      {/* Candidate Spotlights */}
      <Suspense fallback={<CandidateSpotlightSkeleton />}>
        <CandidateSpotlightsContainer />
      </Suspense>

      {/* Disputes Table */}
      <Suspense fallback={<DisputeTableSkeleton />}>
        <DisputesContainer />
      </Suspense>

      {/* Insights */}
      <Suspense fallback={<InsightsSkeleton />}>
        <InsightsContainer />
      </Suspense>

      {/* Distribution Charts */}
      <Suspense fallback={<DistributionChartsSkeleton />}>
        <DistributionsContainer />
      </Suspense>

      {/* Rankings */}
      <Suspense fallback={<RankingsSkeleton />}>
        <RankingsContainer />
      </Suspense>
    </div>
  );
}
