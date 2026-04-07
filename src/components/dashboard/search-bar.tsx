"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SearchResult {
  municipalities: Array<{ id: string; name: string }>;
  candidates: Array<{
    id: string;
    candidateName: string;
    party: string | null;
    office: string;
    year: number;
    totalVotes: number;
    status: string | null;
  }>;
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

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shouldSearch = query.trim().length >= 2;

  useEffect(() => {
    if (!shouldSearch) {
      return;
    }

    let isActive = true;
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!isActive) {
        return;
      }

      setResults(data);
      setIsOpen(true);
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [query, shouldSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const nextQuery = e.target.value;
          setQuery(nextQuery);

          if (nextQuery.trim().length < 2) {
            setResults(null);
            setIsOpen(false);
          }
        }}
        placeholder="Buscar municipio, candidato ou partido..."
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white shadow-sm outline-none backdrop-blur-sm transition-shadow placeholder:text-blue-200 focus:border-white/40 focus:ring-2 focus:ring-white/20"
      />

      {isOpen && results && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.municipalities.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Municipios
              </p>
              {results.municipalities.map((m) => (
                <Link
                  key={m.id}
                  href={`/municipio/${m.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {m.name}
                </Link>
              ))}
            </div>
          )}

          {results.candidates.length > 0 && (
            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Candidatos
              </p>
              {results.candidates.map((c) => (
                <Link
                  key={c.id}
                  href={`/candidato/${c.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <div>
                    <span className="font-medium">{c.candidateName}</span>
                    {c.party && (
                      <span className="ml-2 text-zinc-400">({c.party})</span>
                    )}
                    <span className="ml-2 text-xs text-zinc-400">
                      {OFFICE_LABELS[c.office] ?? c.office} {c.year}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-zinc-400">
                    {c.totalVotes.toLocaleString("pt-BR")} votos
                  </span>
                </Link>
              ))}
            </div>
          )}

          {results.municipalities.length === 0 &&
            results.candidates.length === 0 && (
              <div className="p-4 text-center text-sm text-zinc-400">
                Nenhum resultado encontrado
              </div>
            )}
        </div>
      )}
    </div>
  );
}
