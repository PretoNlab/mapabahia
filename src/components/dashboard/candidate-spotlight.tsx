import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CandidateSpotlightItem {
  id: string;
  ballotName: string;
  party: string | null;
  office: string;
  year: number;
  round: number;
  totalVotes: number;
  status: string | null;
}

interface CandidateSpotlightProps {
  title: string;
  description: string;
  items: CandidateSpotlightItem[];
}

const OFFICE_LABELS: Record<string, string> = {
  prefeito: "Prefeito",
  vereador: "Vereador",
  governador: "Governador",
  senador: "Senador",
  dep_federal: "Dep. Federal",
  dep_estadual: "Dep. Estadual",
  presidente: "Presidente",
};

function getStatusVariant(status: string | null) {
  if (!status) return "default";
  if (status.includes("ELEITO")) return "success";
  if (status.includes("2")) return "warning";
  return "default";
}

export function CandidateSpotlight({
  title,
  description,
  items,
}: CandidateSpotlightProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/candidato/${item.id}`}
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.ballotName}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {OFFICE_LABELS[item.office] ?? item.office} • {item.year}
                      {item.round > 1 ? ` • ${item.round}º turno` : ""}
                      {item.party ? ` • ${item.party}` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {item.totalVotes.toLocaleString("pt-BR")}
                </p>
                <div className="mt-1 flex justify-end">
                  {item.status ? (
                    <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                  ) : (
                    <span className="text-xs text-zinc-400">Sem status</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
