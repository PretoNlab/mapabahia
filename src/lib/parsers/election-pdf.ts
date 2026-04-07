/**
 * Deterministic regex-based parser for TSE election result PDFs.
 * Extracts structured data from the "Resumo Geral do Município" pages.
 */

export interface ParsedElectionSummary {
  municipalityName: string | null;
  tseCode: string | null;
  uf: string | null;
  year: number | null;
  round: number | null;

  totalSections: number | null;
  eligibleVoters: number | null;
  turnout: number | null;
  turnoutPercentage: number | null;
  abstention: number | null;
  abstentionPercentage: number | null;

  // Prefeito
  totalVotesMayor: number | null;
  validVotesMayor: number | null;
  validVotesMayorPercentage: number | null;
  nullVotesMayor: number | null;
  nullVotesMayorPercentage: number | null;
  blankVotesMayor: number | null;
  blankVotesMayorPercentage: number | null;

  // Vereador
  totalVotesCouncil: number | null;
  validVotesCouncil: number | null;
  validVotesCouncilPercentage: number | null;
  nominalVotesCouncil: number | null;
  legendVotesCouncil: number | null;
  nullVotesCouncil: number | null;
  nullVotesCouncilPercentage: number | null;
  blankVotesCouncil: number | null;
  blankVotesCouncilPercentage: number | null;
}

export interface ParsedCandidate {
  number: string;
  name: string;
  role: string;
  party: string | null;
  coalition: string | null;
  votes: number | null;
  votePercentage: number | null;
  status: string | null;
  voteDestination: string | null;
}

export interface ParsedElectionResult {
  summary: ParsedElectionSummary;
  candidates: ParsedCandidate[];
  rawText: string;
  pageCount: number;
}

function parseNumber(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseInteger(str: string | undefined): number | null {
  const num = parseNumber(str);
  return num !== null ? Math.round(num) : null;
}

function parsePercentage(str: string | undefined): number | null {
  return parseNumber(str);
}

export function parseSummaryFromText(text: string): ParsedElectionSummary {
  const summary: ParsedElectionSummary = {
    municipalityName: null,
    tseCode: null,
    uf: null,
    year: null,
    round: null,
    totalSections: null,
    eligibleVoters: null,
    turnout: null,
    turnoutPercentage: null,
    abstention: null,
    abstentionPercentage: null,
    totalVotesMayor: null,
    validVotesMayor: null,
    validVotesMayorPercentage: null,
    nullVotesMayor: null,
    nullVotesMayorPercentage: null,
    blankVotesMayor: null,
    blankVotesMayorPercentage: null,
    totalVotesCouncil: null,
    validVotesCouncil: null,
    validVotesCouncilPercentage: null,
    nominalVotesCouncil: null,
    legendVotesCouncil: null,
    nullVotesCouncil: null,
    nullVotesCouncilPercentage: null,
    blankVotesCouncil: null,
    blankVotesCouncilPercentage: null,
  };

  // Municipality name and code from cover or header
  const munMatch = text.match(
    /(\d+)\s*-\s*([A-ZÀ-Ü][A-ZÀ-Ü\s'-]+)\s*-\s*([A-Z]{2})/
  );
  if (munMatch) {
    summary.tseCode = munMatch[1];
    summary.municipalityName = munMatch[2].trim();
    summary.uf = munMatch[3];
  }

  // Year and round
  const yearMatch = text.match(/Eleições Municipais (\d{4})/);
  if (yearMatch) summary.year = parseInt(yearMatch[1], 10);

  const roundMatch = text.match(/(\d)º Turno/);
  if (roundMatch) summary.round = parseInt(roundMatch[1], 10);

  // Total sections
  const sectionsMatch = text.match(
    /1\.Seções eleitorais\s+([\d.]+)/
  );
  if (sectionsMatch) summary.totalSections = parseInteger(sectionsMatch[1]);

  // --- Eleição Majoritária (sections 2.x) ---

  // Eligible voters (2.2)
  const eligibleMatch = text.match(
    /2\.2 Eleitorado apto a votar\s+([\d.]+)/
  );
  if (eligibleMatch) summary.eligibleVoters = parseInteger(eligibleMatch[1]);

  // Turnout (2.3)
  const turnoutMatch = text.match(
    /2\.3 Comparecimento\s+([\d,]+)%\s+([\d.]+)/
  );
  if (turnoutMatch) {
    summary.turnoutPercentage = parsePercentage(turnoutMatch[1]);
    summary.turnout = parseInteger(turnoutMatch[2]);
  }

  // Abstention (2.4)
  const abstentionMatch = text.match(
    /2\.4 Abstenção\s+([\d,]+)%\s+([\d.]+)/
  );
  if (abstentionMatch) {
    summary.abstentionPercentage = parsePercentage(abstentionMatch[1]);
    summary.abstention = parseInteger(abstentionMatch[2]);
  }

  // Total votes Mayor (2.5.1)
  const totalMayorMatch = text.match(
    /2\.5\.1 Total de votos - Prefeito\s+([\d.]+)/
  );
  if (totalMayorMatch) summary.totalVotesMayor = parseInteger(totalMayorMatch[1]);

  // Valid votes Mayor: "a) Votos a candidatos(as) concorrentes XX,XX% NNNN"
  // Then sub-line "Votos válidos XX,XX% NNNN"
  const validMayorMatch = text.match(
    /2\.5[\s\S]*?a\) Votos a candidatos\(as\) concorrentes\s+([\d,]+)%\s+([\d.]+)/
  );
  if (validMayorMatch) {
    summary.validVotesMayorPercentage = parsePercentage(validMayorMatch[1]);
    summary.validVotesMayor = parseInteger(validMayorMatch[2]);
  }

  // Null votes Mayor: "b) Votos nulos XX,XX% NNNN"
  const nullMayorMatch = text.match(
    /2\.5[\s\S]*?b\) Votos nulos\s+([\d,]+)%\s+([\d.]+)/
  );
  if (nullMayorMatch) {
    summary.nullVotesMayorPercentage = parsePercentage(nullMayorMatch[1]);
    summary.nullVotesMayor = parseInteger(nullMayorMatch[2]);
  }

  // Blank votes Mayor: "c) Votos em branco XX,XX% NNNN"
  const blankMayorMatch = text.match(
    /2\.5[\s\S]*?c\) Votos em branco\s+([\d,]+)%\s+([\d.]+)/
  );
  if (blankMayorMatch) {
    summary.blankVotesMayorPercentage = parsePercentage(blankMayorMatch[1]);
    summary.blankVotesMayor = parseInteger(blankMayorMatch[2]);
  }

  // --- Eleição Proporcional (sections 3.x) ---

  // Total votes Council (3.5.1)
  const totalCouncilMatch = text.match(
    /3\.5\.1 Total de votos - Vereador\s+([\d.]+)/
  );
  if (totalCouncilMatch)
    summary.totalVotesCouncil = parseInteger(totalCouncilMatch[1]);

  // Valid votes Council
  const validCouncilMatch = text.match(
    /3\.5[\s\S]*?a\) Votos a candidatos\(as\) e partidos.*?concorrentes\s+([\d,]+)%\s+([\d.]+)/
  );
  if (validCouncilMatch) {
    summary.validVotesCouncilPercentage = parsePercentage(validCouncilMatch[1]);
    summary.validVotesCouncil = parseInteger(validCouncilMatch[2]);
  }

  // Nominal votes Council
  const nominalMatch = text.match(
    /Votos nominais\s+([\d,]+)%\s+([\d.]+)/
  );
  if (nominalMatch) summary.nominalVotesCouncil = parseInteger(nominalMatch[2]);

  // Legend votes Council
  const legendMatch = text.match(
    /Votos para legenda\s+([\d,]+)%\s+([\d.]+)/
  );
  if (legendMatch) summary.legendVotesCouncil = parseInteger(legendMatch[2]);

  // Null votes Council
  const nullCouncilMatch = text.match(
    /3\.5[\s\S]*?b\) Votos nulos\s+([\d,]+)%\s+([\d.]+)/
  );
  if (nullCouncilMatch) {
    summary.nullVotesCouncilPercentage = parsePercentage(nullCouncilMatch[1]);
    summary.nullVotesCouncil = parseInteger(nullCouncilMatch[2]);
  }

  // Blank votes Council
  const blankCouncilMatch = text.match(
    /3\.5[\s\S]*?c\) Votos em branco\s+([\d,]+)%\s+([\d.]+)/
  );
  if (blankCouncilMatch) {
    summary.blankVotesCouncilPercentage = parsePercentage(blankCouncilMatch[1]);
    summary.blankVotesCouncil = parseInteger(blankCouncilMatch[2]);
  }

  return summary;
}

/**
 * Parse candidate results from Anexo IX text.
 */
export function parseCandidatesFromText(text: string): ParsedCandidate[] {
  const candidates: ParsedCandidate[] = [];

  // --- Prefeito candidates from Anexo IX ---
  const prefeitoSection = text.match(
    /Anexo IX - Resultado de votação\s*\n.*?Cargo: Prefeito\s*\n([\s\S]*?)(?=Cargo: Vereador|Anexo X|$)/
  );

  if (prefeitoSection) {
    // Pattern: *?NUMBER - NAME VOTES PERCENTAGE% STATUS
    const prefeitoPattern =
      /\*?(\d+)\s*-\s*([A-ZÀ-Ü][A-ZÀ-Ü\s.'-]+?)\s+([\d.]+)\s+([\d,]+)%\s+(Válido|Anulado)\s+(Eleito|Não eleito|2º turno)/gi;
    let match;
    while ((match = prefeitoPattern.exec(prefeitoSection[1])) !== null) {
      candidates.push({
        number: match[1],
        name: match[2].trim(),
        role: "prefeito",
        party: null,
        coalition: null,
        votes: parseInteger(match[3]),
        votePercentage: parsePercentage(match[4]),
        status: match[6],
        voteDestination: match[5],
      });
    }
  }

  // --- Vereador candidates from Anexo IX ---
  const vereadorSection = text.match(
    /Anexo IX - Resultado de votação[\s\S]*?Cargo: Vereador\s*\n([\s\S]*?)(?=Resultado em|Anexo X|$)/
  );

  if (vereadorSection) {
    // Pattern: *?NUMBER - NAME VOTES STATUS
    const vereadorPattern =
      /\*?(\d+)\s*-\s*([A-ZÀ-Ü][A-ZÀ-Ü\s.'-]+?)\s+([\d.]+)\s+(Válido|Anulado)\s+(Eleito por QP|Eleito por média|Não eleito|\d+º Suplente)/gi;
    let match;
    while ((match = vereadorPattern.exec(vereadorSection[1])) !== null) {
      candidates.push({
        number: match[1],
        name: match[2].trim(),
        role: "vereador",
        party: null,
        coalition: null,
        votes: parseInteger(match[3]),
        votePercentage: null,
        status: match[5],
        voteDestination: match[4],
      });
    }
  }

  // Try to enrich with party info from Anexo X
  const partyBlocks = text.matchAll(
    /(\d+\s*-\s*[A-ZÀ-Ü]+(?:\s+[A-ZÀ-Ü]+)*)\s+Votos computados[\s\S]*?(?=\d+\s*-\s*[A-ZÀ-Ü]|Resultado em|Anexo)/g
  );

  for (const block of partyBlocks) {
    const partyNameMatch = block[0].match(/^(\d+)\s*-\s*(.+?)\s+Votos/);
    if (!partyNameMatch) continue;
    const partyAbbr = `${partyNameMatch[1]} - ${partyNameMatch[2].trim()}`;

    const candidateLines = block[0].matchAll(
      /\*?(\d+)\s*-\s*([A-ZÀ-Ü][A-ZÀ-Ü\s.'-]+)/g
    );
    for (const cl of candidateLines) {
      // Skip the header line
      if (cl[2].includes("Votos")) continue;
      const existing = candidates.find(
        (c) => c.number === cl[1] && !c.party
      );
      if (existing) {
        existing.party = partyAbbr;
      }
    }
  }

  return candidates;
}

export function parseElectionPdf(
  text: string,
  pageCount: number
): ParsedElectionResult {
  return {
    summary: parseSummaryFromText(text),
    candidates: parseCandidatesFromText(text),
    rawText: text,
    pageCount,
  };
}
