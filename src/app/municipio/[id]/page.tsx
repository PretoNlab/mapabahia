import { prisma } from "@/lib/db/prisma";
import { getMunicipalityInsights } from "@/lib/analytics/rankings";
import { getMunicipalityMayoralComparison } from "@/lib/analytics/elections";
import {
  CURRENT_MUNICIPAL_ELECTION,
  CURRENT_SUMMARY_ORDER_BY,
  CURRENT_SUMMARY_SCOPE,
} from "@/lib/election-scope";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { InsightList } from "@/components/insights/insight-list";
import { ComparisonBar } from "@/components/municipality/comparison-bar";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MunicipalityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [municipality, legacyCandidates, comparison] = await Promise.all([
    prisma.municipality.findUnique({
      where: { id },
      include: {
        resultSummaries: {
          where: CURRENT_SUMMARY_SCOPE,
          orderBy: CURRENT_SUMMARY_ORDER_BY,
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            year: true,
            round: true,
            status: true,
          },
        },
        voteResults: {
          where: {
            election: {
              is: {
                year: CURRENT_MUNICIPAL_ELECTION.year,
                round: CURRENT_MUNICIPAL_ELECTION.round,
                type: CURRENT_MUNICIPAL_ELECTION.type,
              },
            },
          },
          include: { candidate: true },
          orderBy: { votes: "desc" },
        },
      },
    }),
    prisma.candidateResultLegacy.findMany({
      where: { document: { municipalityId: id } },
      orderBy: [{ role: "asc" }, { votes: "desc" }],
    }),
    getMunicipalityMayoralComparison(id),
  ]);

  if (!municipality) notFound();

  const summary = municipality.resultSummaries[0];
  const insightsData = await getMunicipalityInsights(id);

  // Use new VoteResult data if available, fall back to legacy
  const hasNewDataForOffice = (office: "prefeito" | "vereador") =>
    municipality.voteResults.some((voteResult) => voteResult.candidate.office === office);
  const aggregateVoteResults = (
    office: "prefeito" | "vereador"
  ) => {
    const filtered = municipality.voteResults.filter(
      (voteResult) => voteResult.candidate.office === office
    );
    const totalVotes = filtered.reduce((sum, voteResult) => sum + voteResult.votes, 0);
    const grouped = new Map<string, {
      id: string;
      candidateNumber: string;
      candidateName: string;
      party: string | null;
      coalition: string | null;
      votes: number;
      votePercentage: number | null;
      status: string | null;
      role: string;
      voteDestination: string | null;
    }>();

    for (const voteResult of filtered) {
      const existing = grouped.get(voteResult.candidate.id);
      if (existing) {
        existing.votes += voteResult.votes;
      } else {
        grouped.set(voteResult.candidate.id, {
          id: voteResult.candidate.id,
          candidateNumber: voteResult.candidate.ballotNumber,
          candidateName: voteResult.candidate.ballotName,
          party: voteResult.candidate.party,
          coalition: voteResult.candidate.coalition,
          votes: voteResult.votes,
          votePercentage: null,
          status: voteResult.candidate.status,
          role: voteResult.candidate.office,
          voteDestination: null,
        });
      }
    }

    return [...grouped.values()]
      .map((candidate) => ({
        ...candidate,
        votePercentage: totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : null,
      }))
      .sort((a, b) => b.votes - a.votes);
  };

  const prefeitos = hasNewDataForOffice("prefeito")
    ? aggregateVoteResults("prefeito")
    : legacyCandidates.filter((c) => c.role === "prefeito");

  const vereadores = hasNewDataForOffice("vereador")
    ? aggregateVoteResults("vereador")
    : legacyCandidates.filter((c) => c.role === "vereador");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-700">
          Dashboard
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900 dark:text-zinc-100">
          {municipality.name}
        </span>
      </nav>

      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 px-8 py-8 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {municipality.name}
            </h1>
            <Badge variant="info" className="border-white/20 bg-white/15 text-white">
              BA
            </Badge>
            {municipality.ibgeCode && (
              <Badge className="border-white/20 bg-white/15 text-white">
                IBGE: {municipality.ibgeCode}
              </Badge>
            )}
            {municipality.tseCode && (
              <Badge className="border-white/20 bg-white/15 text-white">
                TSE: {municipality.tseCode}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-blue-100">
            Resultados das Eleicoes Municipais 2024 — 1o Turno
          </p>
        </div>
      </div>

      {/* Insights */}
      {insightsData && insightsData.insights.length > 0 && (
        <div className="mb-8">
          <InsightList
            title="Leitura Executiva"
            insights={insightsData.insights}
          />
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Panorama Geral</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Eleitorado Apto"
              value={formatNumber(summary.eligibleVoters)}
            />
            <StatCard
              title="Comparecimento"
              value={formatPercentage(summary.turnoutPercentage)}
              subtitle={`${formatNumber(summary.turnout)} votos`}
              trend={
                insightsData &&
                summary.turnoutPercentage &&
                insightsData.stateAvgTurnout &&
                summary.turnoutPercentage > insightsData.stateAvgTurnout
                  ? "up"
                  : "down"
              }
            />
            <StatCard
              title="Abstencao"
              value={formatPercentage(summary.abstentionPercentage)}
              subtitle={`${formatNumber(summary.abstention)} eleitores`}
              trend={
                insightsData &&
                summary.abstentionPercentage &&
                insightsData.stateAvgAbstention &&
                summary.abstentionPercentage < insightsData.stateAvgAbstention
                  ? "up"
                  : "down"
              }
            />
            <StatCard
              title="Secoes Eleitorais"
              value={formatNumber(summary.totalSections)}
            />
          </div>

          {/* Comparison with State Average */}
          {insightsData && (
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ComparisonBar
                title="Comparecimento vs. Media Estadual"
                items={[
                  {
                    label: municipality.name,
                    value: summary.turnoutPercentage ?? 0,
                    maxValue: 100,
                    color: "#2563eb",
                    formattedValue: formatPercentage(summary.turnoutPercentage),
                  },
                  {
                    label: "Media da Bahia",
                    value: insightsData.stateAvgTurnout ?? 0,
                    maxValue: 100,
                    color: "#a3a3a3",
                    formattedValue: formatPercentage(insightsData.stateAvgTurnout),
                  },
                ]}
              />
              <ComparisonBar
                title="Abstencao vs. Media Estadual"
                items={[
                  {
                    label: municipality.name,
                    value: summary.abstentionPercentage ?? 0,
                    maxValue: 40,
                    color:
                      (summary.abstentionPercentage ?? 0) >
                      (insightsData.stateAvgAbstention ?? 0)
                        ? "#dc2626"
                        : "#10b981",
                    formattedValue: formatPercentage(
                      summary.abstentionPercentage
                    ),
                  },
                  {
                    label: "Media da Bahia",
                    value: insightsData.stateAvgAbstention ?? 0,
                    maxValue: 40,
                    color: "#a3a3a3",
                    formattedValue: formatPercentage(
                      insightsData.stateAvgAbstention
                    ),
                  },
                ]}
              />
            </div>
          )}

          {(comparison.current || comparison.previous) && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Comparacao 2020 x 2024</h2>
              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
                <StatCard
                  title="Vencedor 2020"
                  value={comparison.previous?.winnerName ?? "—"}
                  subtitle={comparison.previous?.winnerParty ?? "Sem base municipal 2020"}
                />
                <StatCard
                  title="Vencedor 2024"
                  value={comparison.current?.winnerName ?? "—"}
                  subtitle={comparison.current?.winnerParty ?? "Sem base municipal 2024"}
                />
                <StatCard
                  title="Mudanca de Lideranca"
                  value={
                    comparison.current && comparison.previous
                      ? comparison.changedWinner
                        ? "Sim"
                        : "Nao"
                      : "—"
                  }
                  subtitle={
                    comparison.current && comparison.previous
                      ? comparison.changedParty
                        ? "Partido vencedor mudou"
                        : "Partido vencedor mantido"
                      : "Comparacao indisponivel"
                  }
                />
                <StatCard
                  title="Margem 2024"
                  value={
                    comparison.current
                      ? `${comparison.current.marginPercentage.toFixed(2)}%`
                      : "—"
                  }
                  subtitle={
                    comparison.current
                      ? `${formatNumber(comparison.current.marginVotes)} votos de diferenca`
                      : "Sem disputa municipal carregada"
                  }
                />
              </div>

              {comparison.current && comparison.previous && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Disputa para Prefeito</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 text-sm">
                        <div className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-zinc-500">2020</p>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {comparison.previous.winnerName}
                                {comparison.previous.winnerParty
                                  ? ` (${comparison.previous.winnerParty})`
                                  : ""}
                              </p>
                              <p className="mt-1 text-zinc-500">
                                contra {comparison.previous.runnerUpName ?? "—"}
                                {comparison.previous.runnerUpParty
                                  ? ` (${comparison.previous.runnerUpParty})`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold tabular-nums">
                                {comparison.previous.marginPercentage.toFixed(2)}%
                              </p>
                              <p className="text-zinc-500">
                                {formatNumber(comparison.previous.marginVotes)} votos
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-zinc-500">2024</p>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {comparison.current.winnerName}
                                {comparison.current.winnerParty
                                  ? ` (${comparison.current.winnerParty})`
                                  : ""}
                              </p>
                              <p className="mt-1 text-zinc-500">
                                contra {comparison.current.runnerUpName ?? "—"}
                                {comparison.current.runnerUpParty
                                  ? ` (${comparison.current.runnerUpParty})`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold tabular-nums">
                                {comparison.current.marginPercentage.toFixed(2)}%
                              </p>
                              <p className="text-zinc-500">
                                {formatNumber(comparison.current.marginVotes)} votos
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Leitura Comparativa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                        <p>
                          Em 2020, o vencedor foi{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {comparison.previous.winnerName}
                          </span>
                          {comparison.previous.winnerParty
                            ? `, do ${comparison.previous.winnerParty}`
                            : ""}, com margem de{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {comparison.previous.marginPercentage.toFixed(2)}%
                          </span>.
                        </p>
                        <p>
                          Em 2024, a liderança ficou com{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {comparison.current.winnerName}
                          </span>
                          {comparison.current.winnerParty
                            ? `, do ${comparison.current.winnerParty}`
                            : ""}, com margem de{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {comparison.current.marginPercentage.toFixed(2)}%
                          </span>.
                        </p>
                        <p>
                          {comparison.changedWinner
                            ? "Houve troca de liderança entre as duas eleições."
                            : "A liderança nominal foi mantida entre 2020 e 2024."}{" "}
                          {comparison.changedParty
                            ? "O partido vencedor também mudou."
                            : "O partido vencedor permaneceu o mesmo."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Mayor Results */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Votacao para Prefeito
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total de votos</span>
                    <span className="font-medium">
                      {formatNumber(summary.totalVotesMayor)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos validos</span>
                    <span className="font-medium">
                      {formatNumber(summary.validVotesMayor)}{" "}
                      ({formatPercentage(summary.validVotesMayorPercentage)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos nulos</span>
                    <span className="font-medium">
                      {formatNumber(summary.nullVotesMayor)}{" "}
                      ({formatPercentage(summary.nullVotesMayorPercentage)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos em branco</span>
                    <span className="font-medium">
                      {formatNumber(summary.blankVotesMayor)}{" "}
                      ({formatPercentage(summary.blankVotesMayorPercentage)})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Votacao para Vereador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total de votos</span>
                    <span className="font-medium">
                      {formatNumber(summary.totalVotesCouncil)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos validos</span>
                    <span className="font-medium">
                      {formatNumber(summary.validVotesCouncil)}{" "}
                      ({formatPercentage(summary.validVotesCouncilPercentage)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos nominais</span>
                    <span className="font-medium">
                      {formatNumber(summary.nominalVotesCouncil)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos de legenda</span>
                    <span className="font-medium">
                      {formatNumber(summary.legendVotesCouncil)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos nulos</span>
                    <span className="font-medium">
                      {formatNumber(summary.nullVotesCouncil)}{" "}
                      ({formatPercentage(summary.nullVotesCouncilPercentage)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Votos em branco</span>
                    <span className="font-medium">
                      {formatNumber(summary.blankVotesCouncil)}{" "}
                      ({formatPercentage(summary.blankVotesCouncilPercentage)})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Candidates */}
      {prefeitos.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Candidatos a Prefeito</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="pb-3 text-left font-medium text-zinc-500">
                        Candidato
                      </th>
                      <th className="pb-3 text-left font-medium text-zinc-500">
                        Partido
                      </th>
                      <th className="pb-3 text-right font-medium text-zinc-500">
                        Votos
                      </th>
                      <th className="pb-3 text-right font-medium text-zinc-500">
                        %
                      </th>
                      <th className="pb-3 text-right font-medium text-zinc-500">
                        Situacao
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prefeitos.map((c) => {
                      const maxPct = Math.max(
                        ...prefeitos.map((p) => p.votePercentage ?? 0),
                        1
                      );
                      const barWidth =
                        ((c.votePercentage ?? 0) / maxPct) * 100;
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-zinc-100 dark:border-zinc-800/50"
                        >
                          <td className="py-3">
                            <span className="font-medium">
                              {c.candidateName}
                            </span>
                            <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor:
                                    c.status?.includes("ELEITO") || c.status?.includes("Eleito")
                                      ? "#10b981"
                                      : "#a3a3a3",
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 text-zinc-500">
                            {c.party ?? "—"}
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            {formatNumber(c.votes)}
                          </td>
                          <td className="py-3 text-right tabular-nums font-semibold">
                            {formatPercentage(c.votePercentage)}
                          </td>
                          <td className="py-3 text-right">
                            <Badge
                              variant={
                                c.status?.includes("ELEITO") || c.status?.includes("Eleito")
                                  ? "success"
                                  : "default"
                              }
                            >
                              {c.status ?? "—"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {vereadores.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">
            Vereadores ({vereadores.length} candidatos)
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="pb-3 text-left font-medium text-zinc-500">
                        No.
                      </th>
                      <th className="pb-3 text-left font-medium text-zinc-500">
                        Candidato
                      </th>
                      <th className="pb-3 text-left font-medium text-zinc-500">
                        Partido
                      </th>
                      <th className="pb-3 text-right font-medium text-zinc-500">
                        Votos
                      </th>
                      <th className="pb-3 text-right font-medium text-zinc-500">
                        Situacao
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vereadores.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-zinc-100 dark:border-zinc-800/50"
                      >
                        <td className="py-2 text-zinc-500 tabular-nums">
                          {c.candidateNumber}
                        </td>
                        <td className="py-2 font-medium">{c.candidateName}</td>
                        <td className="py-2 text-zinc-500">{c.party ?? "—"}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(c.votes)}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={
                              c.status?.includes("Eleito")
                                ? "success"
                                : c.status?.includes("Suplente")
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {c.status ?? "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source Documents */}
      {municipality.documents.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Documentos Fonte</h2>
          <Card>
            <CardContent className="pt-6">
              {municipality.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{doc.fileName}</p>
                    <p className="text-xs text-zinc-500">
                      {doc.year} — {doc.round}o Turno
                    </p>
                  </div>
                  <Badge
                    variant={doc.status === "completed" ? "success" : "danger"}
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
