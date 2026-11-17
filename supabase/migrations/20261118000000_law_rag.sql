-- 2주차: 법령 RAG 시드 + FTS 검색 함수
-- Dashboard → SQL Editor에서 실행

-- 기존 MVP 시드 교체(재실행 가능)
delete from public.law_chunks
where article_no in (
  '제1조',
  '제2조',
  '제3조',
  '제10조제1항',
  '제10조제2항',
  '제10조제4항',
  '제10조의4',
  '제10조의8',
  '제10조의9',
  '제11조'
);

insert into public.law_chunks (article_no, body) values
(
  '제1조',
  '제1조(목적) 이 법은 상가건물 임대차에 관하여 「민법」에 대한 특례를 규정하여 국민 경제생활의 안정을 보장함을 목적으로 한다.'
),
(
  '제2조',
  '제2조(적용범위) ① 이 법은 상가건물(제3조제1항에 따른 사업자등록의 대상이 되는 건물을 말한다)의 임대차(임대차 목적물의 주된 부분이 영업용인 경우로 한정한다)에 대하여 적용한다. 다만, 대통령령으로 정하는 보증금액을 초과하는 임대차에 대하여는 그러하지 아니하다.'
),
(
  '제3조',
  '제3조(대항력 등) ① 임대차는 그 등기가 없는 경우에도 임차인이 건물의 인도와 사업자등록을 신청하면 그 다음 날부터 제3자에 대하여 효력이 생긴다.'
),
(
  '제10조제1항',
  '제10조(계약갱신 요구 등) ① 임대인은 임차인이 임대차기간이 만료되기 6개월 전부터 1개월 전까지 사이에 계약갱신을 요구할 경우 정당한 사유 없이 거절하지 못한다. 다만, 다음 각 호의 어느 하나의 경우에는 그러하지 아니하다. 1. 임차인이 3기의 차임액에 해당하는 금액에 이르도록 차임을 연체한 사실이 있는 경우 2. 임차인이 거짓이나 그 밖의 부정한 방법으로 임차한 경우 3. 서로 합의하여 임대인이 임차인에게 상당한 보상을 제공한 경우 4. 임차인이 임대인의 동의 없이 목적 건물의 전부 또는 일부를 전대(轉貸)한 경우 5. 임차인이 임차한 건물의 전부 또는 일부를 고의나 중대한 과실로 파손한 경우 6. 임차한 건물의 전부 또는 일부가 멸실되어 임대차의 목적을 달성하지 못할 경우 7. 임대인이 철거·재건축 등 사유로 목적 건물의 점유를 회복할 필요가 있는 경우 8. 그 밖에 임차인이 임차인으로서의 의무를 현저히 위반하거나 임대차를 계속하기 어려운 중대한 사유가 있는 경우'
),
(
  '제10조제2항',
  '제10조 ② 임차인의 계약갱신요구권은 최초의 임대차기간을 포함한 전체 임대차기간이 10년을 초과하지 아니하는 범위에서만 행사할 수 있다.'
),
(
  '제10조제4항',
  '제10조 ④ 임대인이 제1항의 기간 이내에 임차인에게 갱신 거절의 통지 또는 조건의 변경의 통지를 하지 아니한 경우에는 그 기간이 만료된 때에 전 임대차와 동일한 조건으로 다시 임대차한 것으로 본다. 환산보증금 초과 임대차 등에는 적용이 달라질 수 있다.'
),
(
  '제10조의4',
  '제10조의4(권리금 회수기회 보호 등) 임대인은 법령이 정한 기간에 권리금 회수를 방해하는 행위를 하여서는 아니 된다.'
),
(
  '제10조의8',
  '제10조의8(차임연체와 해지) 임차인의 차임연체액이 3기의 차임액에 달하는 때에는 임대인은 계약을 해지할 수 있다.'
),
(
  '제10조의9',
  '제10조의9(차임연체 등에 관한 특례) 2020년 9월 29일부터 6개월까지 제1급감염병 등에 의한 경제사정의 변동으로 발생한 차임연체액은 제10조제1항제1호 및 제10조의8의 적용에서 제외한다.'
),
(
  '제11조',
  '제11조(차임 등의 증감청구권) ① 차임 또는 보증금이 경제사정의 변동 등으로 상당하지 아니하게 된 경우에는 당사자는 장래에 대하여 증감을 청구할 수 있다. 다만 증액은 대통령령 기준을 초과하지 못한다.'
);

create or replace function public.match_law_chunks(
  query_text text,
  match_count int default 6
)
returns table (
  id uuid,
  article_no text,
  body text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.article_no,
    c.body,
    (
      coalesce(ts_rank(c.body_tsv, plainto_tsquery('simple', query_text)), 0)
      + case when c.article_no ilike '%' || query_text || '%' then 0.5 else 0 end
      + case when c.body ilike '%' || split_part(query_text, ' ', 1) || '%' then 0.2 else 0 end
    )::real as score
  from public.law_chunks c
  where
    length(trim(query_text)) > 0
    and (
      c.body_tsv @@ plainto_tsquery('simple', query_text)
      or c.article_no ilike '%' || query_text || '%'
      or c.body ilike '%' || query_text || '%'
      or exists (
        select 1
        from unnest(string_to_array(query_text, ' ')) as tok
        where length(tok) >= 2
          and (c.body ilike '%' || tok || '%' or c.article_no ilike '%' || tok || '%')
      )
    )
  order by score desc, c.article_no
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_law_chunks(text, int) to authenticated;
grant execute on function public.match_law_chunks(text, int) to service_role;

comment on function public.match_law_chunks is '법령 청크 FTS+키워드 검색. embedding 하이브리드는 추후 query_embedding 인자로 확장.';
