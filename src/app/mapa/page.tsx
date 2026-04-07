import { BahiaMap } from "@/components/map/bahia-map";

export const dynamic = "force-dynamic";

export default function MapaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Mapa da <span className="text-blue-600">Bahia</span>
        </h1>
        <p className="mt-1 text-zinc-500">
          Visualizacao territorial dos indicadores eleitorais. Clique em um
          municipio para ver detalhes.
        </p>
      </div>
      <BahiaMap />
    </div>
  );
}
