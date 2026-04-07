"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CandidateRow {
  id: string;
  name: string;
  ballotName: string;
  ballotNumber: string;
  party: string | null;
  office: string;
  status: string | null;
  year: number;
  electionType: string;
  round: number;
  totalVotes: number;
  municipalities: number;
  concentrationTop10: number;
}

const OFFICE_OPTIONS = [
  { value: "", label: "Todos os Cargos" },
  { value: "prefeito", label: "Prefeito" },
  { value: "vereador", label: "Vereador" },
  { value: "governador", label: "Governador" },
  { value: "senador", label: "Senador" },
  { value: "dep_federal", label: "Dep. Federal" },
  { value: "dep_estadual", label: "Dep. Estadual" },
  { value: "presidente", label: "Presidente" },
];

const YEAR_OPTIONS = [
  { value: "", label: "Todos os Anos" },
  { value: "2024", label: "2024" },
  { value: "2022", label: "2022" },
  { value: "2020", label: "2020" },
  { value: "2018", label: "2018" },
];

const SORT_OPTIONS = [
  { value: "votes", label: "Mais votados" },
  { value: "name", label: "Ordem alfabética" },
];

export default function CandidatosPage() {
  const [query, setQuery] = useState("");
  const [office, setOffice] = useState("");
  const [year, setYear] = useState("");
  const [party, setParty] = useState("");
  const [sort, setSort] = useState("votes");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.length >= 2) params.set("q", query);
    if (office) params.set("office", office);
    if (year) params.set("year", year);
    if (party) params.set("party", party);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", "50");

    const res = await fetch(`/api/candidates?${params}`);
    const data = await res.json();
    setCandidates(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [query, office, year, party, sort, page]);

  useEffect(() => {
    const timer = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Candidatos <span className="text-blue-600">Bahia</span>
        </h1>
        <p className="mt-1 text-zinc-500">
          Busque candidatos e veja a distribuição de votos por município
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <select
              value={office}
              onChange={(e) => {
                setOffice(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {OFFICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {YEAR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Partido (ex: PT, PL)"
              value={party}
              onChange={(e) => {
                setParty(e.target.value.toUpperCase());
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {loading ? "Buscando..." : `${total.toLocaleString("pt-BR")} candidatos encontrados`}
            </CardTitle>
            <p className="text-sm text-zinc-500">
              {sort === "votes"
                ? "Ordenado por força eleitoral no recorte filtrado."
                : "Ordenado alfabeticamente."}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border px-2 py-1 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-zinc-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border px-2 py-1 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    Candidato
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    Partido
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    Cargo
                  </th>
                  <th className="pb-3 text-center font-medium text-zinc-500">
                    Ano
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500">
                    Municípios
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500">
                    Total Votos
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500">
                    Top 10
                  </th>
                  <th className="pb-3 text-right font-medium text-zinc-500">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/50"
                  >
                    <td className="py-3">
                      <Link
                        href={`/candidato/${c.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {c.ballotName}
                      </Link>
                      <span className="ml-2 text-xs text-zinc-400">
                        {c.ballotNumber}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-600">{c.party ?? "—"}</td>
                    <td className="py-3 capitalize text-zinc-600">
                      {c.office.replace("_", " ")}
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant="default">{c.year}</Badge>
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-600">
                      {c.municipalities.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 text-right tabular-nums font-semibold">
                      {c.totalVotes.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-600">
                      {c.concentrationTop10.toFixed(1)}%
                    </td>
                    <td className="py-3 text-right">
                      {c.status && (
                        <Badge
                          variant={
                            c.status.includes("ELEITO")
                              ? "success"
                              : c.status.includes("2")
                                ? "warning"
                                : "default"
                          }
                        >
                          {c.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && candidates.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-zinc-400"
                    >
                      {query.length < 2
                        ? "Digite pelo menos 2 caracteres para buscar"
                        : "Nenhum candidato encontrado"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
