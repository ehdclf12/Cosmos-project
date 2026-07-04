-- 021_goods_is_active.sql
-- 상품별 노출 플래그. status(active/sold_out/draft)와 독립.
-- is_active=false → 홈 목록·상세에서 완전 숨김(관리 목록엔 유지).
-- 기본 true → 기존 상품 전부 노출 유지(회귀 없음).

alter table public.goods
  add column if not exists is_active boolean not null default true;
