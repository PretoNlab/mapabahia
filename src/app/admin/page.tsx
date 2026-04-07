import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    jobs,
    totalDocs,
    completedDocs,
    errorDocs,
    totalMunicipalities,
    municipalitiesWithGeo,
    municipalitiesWithDocs,
    errorDocsList,
  ] = await Promise.all([
    prisma.ingestionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.electionDocument.count(),
    prisma.electionDocument.count({ where: { status: "completed" } }),
    prisma.electionDocument.count({ where: { status: "error" } }),
    prisma.municipality.count(),
    prisma.municipality.count({ where: { geoJson: { not: null } } }),
    prisma.municipality.count({
      where: { documents: { some: {} } },
    }),
    prisma.electionDocument.findMany({
      where: { status: "error" },
      select: {
        id: true,
        fileName: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const geoMatchedWithDocs = await prisma.municipality.count({
    where: {
      geoJson: { not: null },
      documents: { some: {} },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Painel <span className="text-blue-600">Admin</span>
        </h1>
        <p className="mt-1 text-zinc-500">
          Monitoramento de ingestao, processamento e casamento de dados
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Documentos" value={String(totalDocs)} />
        <StatCard
          title="Processados"
          value={String(completedDocs)}
          trend="up"
          subtitle={`${((completedDocs / Math.max(totalDocs, 1)) * 100).toFixed(0)}% do total`}
        />
        <StatCard
          title="Com Erro"
          value={String(errorDocs)}
          trend={errorDocs > 0 ? "down" : "up"}
        />
        <StatCard title="Municipios" value={String(totalMunicipalities)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Municipios com GeoJSON"
          value={String(municipalitiesWithGeo)}
        />
        <StatCard
          title="Municipios com Documentos"
          value={String(municipalitiesWithDocs)}
        />
        <StatCard
          title="Casamento GeoJSON + Docs"
          value={`${geoMatchedWithDocs} / ${municipalitiesWithGeo}`}
          subtitle={`${((geoMatchedWithDocs / Math.max(municipalitiesWithGeo, 1)) * 100).toFixed(0)}% casados`}
        />
      </div>

      {/* CLI Instructions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Comandos de Processamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-zinc-900 px-4 py-3 font-mono text-zinc-100">
              <p className="text-zinc-400"># Importar GeoJSON</p>
              <p>npx tsx scripts/import-geojson.ts ../municipios-bahia.json</p>
            </div>
            <div className="rounded-lg bg-zinc-900 px-4 py-3 font-mono text-zinc-100">
              <p className="text-zinc-400"># Processar todos os PDFs</p>
              <p>
                npx tsx scripts/process-pdfs.ts
                ../Relatorio_Resultado_Totalizacao_2024_BA
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900 px-4 py-3 font-mono text-zinc-100">
              <p className="text-zinc-400"># Reprocessar (roda novamente)</p>
              <p>
                npx tsx scripts/process-pdfs.ts
                ../Relatorio_Resultado_Totalizacao_2024_BA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs */}
      <h2 className="mb-4 text-xl font-semibold">Jobs de Ingestao</h2>
      {jobs.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="py-8 text-center text-zinc-400">
            Nenhum job encontrado. Execute o script de processamento.
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-3 text-left font-medium text-zinc-500">
                      ID
                    </th>
                    <th className="pb-3 text-left font-medium text-zinc-500">
                      Status
                    </th>
                    <th className="pb-3 text-right font-medium text-zinc-500">
                      Total
                    </th>
                    <th className="pb-3 text-right font-medium text-zinc-500">
                      Sucesso
                    </th>
                    <th className="pb-3 text-right font-medium text-zinc-500">
                      Falhas
                    </th>
                    <th className="pb-3 text-right font-medium text-zinc-500">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <td className="py-3 font-mono text-xs">
                        {job.id.substring(0, 8)}...
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "success"
                              : job.status === "failed"
                                ? "danger"
                                : job.status === "running"
                                  ? "info"
                                  : "default"
                          }
                        >
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {job.totalFiles}
                      </td>
                      <td className="py-3 text-right tabular-nums text-emerald-600">
                        {job.succeeded}
                      </td>
                      <td className="py-3 text-right tabular-nums text-red-500">
                        {job.failed}
                      </td>
                      <td className="py-3 text-right text-zinc-500">
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Documents */}
      {errorDocsList.length > 0 && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Documentos com Erro</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {errorDocsList.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30"
                  >
                    <p className="text-sm font-medium">{doc.fileName}</p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {doc.errorMessage}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
