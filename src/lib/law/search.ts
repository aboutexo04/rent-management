import { createClient } from "@/lib/supabase/server";
import {
  DRAFT_KIND_RAG,
  LAW_CHUNK_SEEDS,
  type LawChunkSeed,
} from "@/lib/law/chunks";

export type LawSearchHit = {
  articleNo: string;
  body: string;
  score: number;
  source: "db" | "local";
};

function tokenize(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .split(/[^0-9a-zA-Z가-힣]+/)
    .filter((t) => t.length >= 1);
}

function localScore(chunk: LawChunkSeed, query: string): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const hay = `${chunk.articleNo} ${chunk.body}`.normalize("NFC").toLowerCase();
  let score = 0;
  for (const t of qTokens) {
    if (hay.includes(t)) score += t.length >= 2 ? 2 : 1;
  }
  if (hay.includes(query.normalize("NFC").toLowerCase())) score += 5;
  return score;
}

function searchLocal(
  query: string,
  preferredArticles: string[],
  limit: number,
): LawSearchHit[] {
  const scored = LAW_CHUNK_SEEDS.map((chunk) => {
    let score = localScore(chunk, query);
    if (preferredArticles.includes(chunk.articleNo)) score += 10;
    return { chunk, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ chunk, score }) => ({
    articleNo: chunk.articleNo,
    body: chunk.body,
    score,
    source: "local" as const,
  }));
}

async function searchDb(
  query: string,
  limit: number,
): Promise<LawSearchHit[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("match_law_chunks", {
      query_text: query,
      match_count: limit,
    });
    if (error || !data) return [];
    return (data as { article_no: string; body: string; score: number }[]).map(
      (row) => ({
        articleNo: row.article_no,
        body: row.body,
        score: Number(row.score) || 0,
        source: "db" as const,
      }),
    );
  } catch {
    return [];
  }
}

function mergeHits(a: LawSearchHit[], b: LawSearchHit[], limit: number) {
  const map = new Map<string, LawSearchHit>();
  for (const hit of [...a, ...b]) {
    const prev = map.get(hit.articleNo);
    if (!prev || hit.score > prev.score) map.set(hit.articleNo, hit);
  }
  return [...map.values()]
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

/** 하이브리드: DB FTS(있으면) + 로컬 키워드, 종류별 우선 조문 리랭크 */
export async function searchLawForDraft(
  kind: string,
  extraQuery = "",
  limit = 6,
): Promise<LawSearchHit[]> {
  const meta = DRAFT_KIND_RAG[kind];
  const query = [meta?.query ?? kind, extraQuery].filter(Boolean).join(" ");
  const preferred = meta?.preferredArticles ?? [];

  const [dbHits, localHits] = await Promise.all([
    searchDb(query, limit * 2),
    Promise.resolve(searchLocal(query, preferred, limit * 2)),
  ]);

  const merged = mergeHits(dbHits, localHits, limit * 2);
  return merged
    .map((hit) => ({
      ...hit,
      score: hit.score + (preferred.includes(hit.articleNo) ? 8 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
