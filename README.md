# Pulso Bahia

Plataforma de inteligencia eleitoral e territorial da Bahia.

Dashboard consultivo e analitico que le PDFs oficiais de resultados eleitorais municipais da Bahia e os transforma em uma plataforma navegavel, visual e consultiva.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** + shadcn/ui components
- **Prisma 7** (SQLite via LibSQL)
- **pdfplumber** (Python) para extracao de texto dos PDFs
- Arquitetura pronta para OpenAI Responses API e RAG

## Setup

### Pre-requisitos

- Node.js 20+
- Python 3.9+ com `pdfplumber` instalado (`pip3 install pdfplumber`)
- npm

### Instalacao

```bash
cd pulso-bahia
npm install
```

### Banco de Dados

```bash
npx prisma migrate dev
npx prisma generate
```

### Importar Dados

#### 1. Importar GeoJSON dos municipios

```bash
npx tsx scripts/import-geojson.ts ../municipios-bahia.json
```

#### 2. Processar PDFs eleitorais

```bash
npx tsx scripts/process-pdfs.ts ../Relatorio_Resultado_Totalizacao_2024_BA
```

Este comando:
- Le todos os PDFs da pasta
- Extrai texto via pdfplumber (Python)
- Parseia dados estruturados com regex
- Salva no banco de dados
- Registra jobs de ingestao

### Rodar o Servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
pulso-bahia/
  prisma/
    schema.prisma          # Modelos: Municipality, ElectionDocument, etc.
    dev.db                 # SQLite database
  scripts/
    import-geojson.ts      # Importa GeoJSON dos municipios
    process-pdfs.ts        # Processamento em lote dos PDFs
    extract-pdf.py         # Extrator Python (pdfplumber)
  src/
    app/
      page.tsx             # Dashboard principal
      mapa/page.tsx        # Mapa interativo da Bahia
      rankings/page.tsx    # Rankings e distribuicoes
      admin/page.tsx       # Painel administrativo
      municipio/[id]/      # Pagina de detalhe do municipio
      api/                 # API Routes (overview, rankings, search, etc.)
    lib/
      db/prisma.ts         # Singleton do Prisma Client
      parsers/             # Parser de PDFs do TSE (regex-based)
      normalizers/         # Normalizacao de nomes de municipios
      analytics/           # Rankings, distribuicoes, insights
      rag/                 # Camada de abstracao para IA/RAG
      pdf/                 # Extracao de texto de PDFs
    components/
      layout/              # Navbar
      dashboard/           # StatCard, RankingTable, SearchBar
      map/                 # Mapa interativo (Canvas)
      municipality/        # Componentes de municipio
      insights/            # InsightList
      ui/                  # Card, Badge (shadcn-style)
```

## Modelo de Dados

- **Municipality**: municipios com GeoJSON, codigo IBGE/TSE
- **ElectionDocument**: PDF processado com status e texto bruto
- **ElectionResultSummary**: metricas agregadas (eleitorado, comparecimento, abstencao, votos)
- **CandidateResult**: candidatos com votos, partido, status (eleito/suplente)
- **SourceChunk**: chunks de texto para futuro RAG
- **IngestionJob**: jobs de processamento em lote

## Funcionalidades

### Dashboard Principal
- Totais agregados (municipios, documentos, eleitorado)
- Insights automaticos derivados dos dados
- Rankings top 10 (eleitorado, comparecimento, abstencao)
- Busca por municipio, candidato ou partido

### Mapa da Bahia
- Mapa interativo com todos os municipios
- Coloracao por indicador (comparecimento, abstencao, eleitorado)
- Hover com dados, clique para navegar

### Rankings e Distribuicoes
- Rankings completos (top e bottom 10)
- Distribuicao por faixas de comparecimento, abstencao e eleitorado
- Comparativos visuais

### Pagina de Municipio
- Panorama geral com metricas
- Leitura executiva automatica
- Comparacao com media estadual
- Tabela de candidatos (prefeito e vereadores)
- Documento-fonte

### Painel Admin
- Status dos jobs de ingestao
- Documentos com erro
- Estatisticas de casamento GeoJSON + documentos
- Comandos CLI para reprocessamento

## Proximos Passos

1. **Busca Semantica**: integrar embeddings (OpenAI) para busca nos documentos
2. **Chat com RAG**: chat consultivo que responde perguntas citando fontes
3. **Resumo por Municipio**: geracao de resumo executivo via LLM
4. **Multiplos Anos**: suporte a comparacoes historicas
5. **Outros Estados**: expandir alem da Bahia
6. **Filtros Avancados**: filtrar por partido, faixa de eleitorado, regiao
7. **Exportacao**: exportar rankings e dados em CSV/Excel
8. **Migracao para Postgres**: para producao, migrar de SQLite para Postgres
9. **Deploy**: configurar deploy em Vercel + Neon/Supabase
