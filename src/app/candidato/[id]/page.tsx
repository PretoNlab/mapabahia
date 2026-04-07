import { prisma } from "@/lib/db/prisma";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { CandidateVoteMap } from "@/components/map/candidate-vote-map";
import { ExportButtons } from "@/components/export-buttons";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const OFFICE_LABELS: Record<string, string> = {
  prefeito: "Prefeito(a)",
  vereador: "Vereador(a)",
  governador: "Governador(a)",
  senador: "Senador(a)",
  dep_federal: "Deputado(a) Federal",
  dep_estadual: "Deputado(a) Estadual",
  presidente: "Presidente",
};

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      election: true,
      voteResults: {
        include: {
          municipality: {
            select: { id: true, name: true, tseCode: true },
          },
        },
        orderBy: { votes: "desc" },
      },
    },
  });

  if (!candidate) notFound();

  const peerVoteTotals = await prisma.voteResult.groupBy({
    by: ["candidateId"],
    where: {
      electionId: candidate.electionId,
      candidate: {
        is: {
          office: candidate.office,
        },
      },
    },
    _sum: {
      votes: true,
    },
  });

  // Aggregate votes by municipality (sum across zones)
  const votesByCityMap = new Map<
    string,
    {
      municipalityId: string;
      name: string;
      tseCode: string | null;
      votes: number;
    }
  >();
  for (const vr of candidate.voteResults) {
    const key = vr.municipalityId;
    const existing = votesByCityMap.get(key);
    if (existing) {
      existing.votes += vr.votes;
    } else {
      votesByCityMap.set(key, {
        municipalityId: vr.municipalityId,
        name: vr.municipality.name,
        tseCode: vr.municipality.tseCode,
        votes: vr.votes,
      });
    }
  }

  const votesByCity = [...votesByCityMap.values()].sort(
    (a, b) => b.votes - a.votes
  );
  const totalVotes = votesByCity.reduce((s, c) => s + c.votes, 0);
  const totalCities = votesByCity.filter((c) => c.votes > 0).length;

  // Top 10 cities
  const top10 = votesByCity.slice(0, 10);
  const top10Votes = top10.reduce((s, c) => s + c.votes, 0);
  const top10Pct = totalVotes > 0 ? (top10Votes / totalVotes) * 100 : 0;
  const top1Pct = totalVotes > 0 && top10[0] ? (top10[0].votes / totalVotes) * 100 : 0;

  const rankedPeers = peerVoteTotals
    .map((peer) => ({
      candidateId: peer.candidateId,
      votes: peer._sum.votes ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes);
  const peerRank = rankedPeers.findIndex((peer) => peer.candidateId === candidate.id) + 1;
  const peerCount = rankedPeers.length;
  const peerTotalVotes = rankedPeers.reduce((sum, peer) => sum + peer.votes, 0);
  const peerAverageVotes = peerCount > 0 ? peerTotalVotes / peerCount : 0;
  const peerMedianVotes =
    peerCount === 0
      ? 0
      : peerCount % 2 === 0
        ? (rankedPeers[peerCount / 2 - 1].votes + rankedPeers[peerCount / 2].votes) / 2
        : rankedPeers[Math.floor(peerCount / 2)].votes;

  const territorialProfile =
    top10Pct >= 80
      ? "concentrado"
      : top10Pct >= 55
        ? "misto"
        : "disperso";
  const capillarityProfile =
    totalCities >= 100
      ? "alta"
      : totalCities >= 30
        ? "media"
        : "baixa";
  const votePerformanceVsMedian = totalVotes - peerMedianVotes;
  const votePerformanceVsAverage = totalVotes - peerAverageVotes;
  const leadingMunicipality = top10[0] ?? null;
  const strategicInsights: string[] = [
    `${candidate.ballotName} ocupa a ${peerRank}ª posição entre ${peerCount} candidaturas para ${OFFICE_LABELS[candidate.office] ?? candidate.office} em ${candidate.election.year}.`,
    `A distribuição territorial é ${territorialProfile}, com ${top10Pct.toFixed(1)}% dos votos concentrados nos 10 principais municípios.`,
    `${leadingMunicipality ? `${leadingMunicipality.name} é o principal reduto, com ${formatNumber(leadingMunicipality.votes)} votos (${top1Pct.toFixed(1)}%).` : "Não há município líder identificado."}`,
    `A capilaridade é ${capillarityProfile}, com votos registrados em ${formatNumber(totalCities)} municípios.`,
    votePerformanceVsMedian >= 0
      ? `O desempenho está ${formatNumber(Math.round(votePerformanceVsMedian))} votos acima da mediana do recorte comparável.`
      : `O desempenho está ${formatNumber(Math.abs(Math.round(votePerformanceVsMedian)))} votos abaixo da mediana do recorte comparável.`,
    votePerformanceVsAverage >= 0
      ? `Também supera a média do grupo em ${formatNumber(Math.round(votePerformanceVsAverage))} votos.`
      : `Fica ${formatNumber(Math.abs(Math.round(votePerformanceVsAverage)))} votos abaixo da média do grupo.`,
  ];

  const votesByCityWithPct = votesByCity.map((c) => ({
    ...c,
    percentage: totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0,
  }));

  // Export data
  const exportHeaders = ["#", "Municipio", "Votos", "% do Total"];
  const exportRows = votesByCity.map((c, i) => [
    i + 1,
    c.name,
    c.votes,
    totalVotes > 0 ? `${((c.votes / totalVotes) * 100).toFixed(2)}%` : "0%",
  ]);
  const excelRows = votesByCity.map((c, i) => ({
    Posicao: i + 1,
    Municipio: c.name,
    Votos: c.votes,
    "% do Total": totalVotes > 0 ? Math.round(((c.votes / totalVotes) * 100) * 100) / 100 : 0,
  }));
  const exportTitle = `${candidate.ballotName} (${candidate.party})`;
  const exportSubtitle = `${OFFICE_LABELS[candidate.office] ?? candidate.office} — ${candidate.election.year} — ${totalVotes.toLocaleString("pt-BR")} votos em ${totalCities} municipios`;
  const exportFilename = `pulso-bahia_${candidate.ballotName.replace(/\s+/g, "-")}_${candidate.election.year}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900">
          Dashboard
        </Link>
        {" / "}
        <Link href="/candidatos" className="hover:text-zinc-900">
          Candidatos
        </Link>
        {" / "}
        <span className="text-zinc-900 dark:text-zinc-100">
          {candidate.ballotName}
        </span>
      </nav>

      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 px-8 py-8 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {candidate.ballotName}
            </h1>
            <Badge className="border-white/20 bg-white/15 text-white">
              {candidate.ballotNumber}
            </Badge>
            <Badge className="border-white/20 bg-white/15 text-white">
              {candidate.party}
            </Badge>
          </div>
          <p className="mt-1 text-blue-100">
            {OFFICE_LABELS[candidate.office] ?? candidate.office} —{" "}
            {candidate.election.description ?? `${candidate.election.type} ${candidate.election.year}`}
            {candidate.election.round > 1 && ` — ${candidate.election.round}º Turno`}
          </p>
          {candidate.status && (
            <div className="mt-3">
              <Badge
                variant={
                  candidate.status.includes("ELEITO") || candidate.status.includes("Eleito")
                    ? "success"
                    : candidate.status.includes("2") // 2º turno
                      ? "warning"
                      : "default"
                }
                className="text-sm"
              >
                {candidate.status}
              </Badge>
            </div>
          )}
          {candidate.coalition && candidate.coalition !== "#NULO#" && (
            <p className="mt-2 text-sm text-blue-200">
              Coligação: {candidate.coalition}
            </p>
          )}
          <div className="mt-4">
            <ExportButtons
              title={exportTitle}
              subtitle={exportSubtitle}
              headers={exportHeaders}
              rows={exportRows}
              excelRows={excelRows}
              filename={exportFilename}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Votos"
          value={formatNumber(totalVotes)}
          subtitle={`em ${totalCities} municípios`}
        />
        <StatCard
          title="Municípios com Votos"
          value={formatNumber(totalCities)}
          subtitle={`de 417 municípios`}
        />
        <StatCard
          title="Cidade com Mais Votos"
          value={top10[0]?.name ?? "—"}
          subtitle={
            top10[0]
              ? `${formatNumber(top10[0].votes)} votos (${((top10[0].votes / totalVotes) * 100).toFixed(1)}%)`
              : ""
          }
        />
        <StatCard
          title="Top 10 Cidades"
          value={`${top10Pct.toFixed(1)}%`}
          subtitle={`${formatNumber(top10Votes)} dos ${formatNumber(totalVotes)} votos`}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Posicao no Recorte"
          value={peerRank > 0 ? `${peerRank}º` : "—"}
          subtitle={`${peerCount} candidaturas para o mesmo cargo`}
        />
        <StatCard
          title="Perfil Territorial"
          value={territorialProfile}
          subtitle={`Top 10 concentram ${formatPercentage(top10Pct)}`}
        />
        <StatCard
          title="Capilaridade"
          value={capillarityProfile}
          subtitle={`${formatNumber(totalCities)} municípios com votos`}
        />
        <StatCard
          title="Mediana do Grupo"
          value={formatNumber(Math.round(peerMedianVotes))}
          subtitle={`Média: ${formatNumber(Math.round(peerAverageVotes))}`}
        />
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Leitura Estratégica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              {strategicInsights.map((insight) => (
                <p key={insight}>{insight}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map + Top Cities */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Votos por Município</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateVoteMap
              votesByCity={votesByCityWithPct}
              candidateName={candidate.ballotName}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 20 Municípios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {votesByCity.slice(0, 20).map((city, i) => {
                const pct =
                  totalVotes > 0 ? (city.votes / totalVotes) * 100 : 0;
                const barWidth =
                  (city.votes / (votesByCity[0]?.votes || 1)) * 100;
                return (
                  <div key={city.municipalityId}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-right text-xs text-zinc-400">
                          {i + 1}
                        </span>
                        <Link
                          href={`/municipio/${city.municipalityId}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {city.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="tabular-nums text-zinc-500">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="w-20 tabular-nums font-semibold">
                          {city.votes.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="ml-7 mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Todos os Municípios ({votesByCity.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="pb-3 text-left font-medium text-zinc-500">#</th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    Município
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500">
                    Votos
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500">
                    % do Total
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    Distribuição
                  </th>
                </tr>
              </thead>
              <tbody>
                {votesByCity.map((city, i) => {
                  const pct =
                    totalVotes > 0 ? (city.votes / totalVotes) * 100 : 0;
                  const barWidth =
                    (city.votes / (votesByCity[0]?.votes || 1)) * 100;
                  return (
                    <tr
                      key={city.municipalityId}
                      className="border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <td className="py-2 text-zinc-400 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="py-2">
                        <Link
                          href={`/municipio/${city.municipalityId}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {city.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums font-semibold">
                        {city.votes.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 text-right tabular-nums text-zinc-500">
                        {pct.toFixed(2)}%
                      </td>
                      <td className="py-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
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
  );
}
