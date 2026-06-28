-- 005_goods_status_fix.sql
-- goods_status_check 제약을 active/sold_out/draft 로 교체
-- 기존 'available' 값을 'active' 로 마이그레이션

-- 1. 기존 제약 삭제
alter table public.goods
  drop constraint if exists goods_status_check;

-- 2. 기존 'available' 레코드를 'active' 로 변환
update public.goods
  set status = 'active'
  where status = 'available';

-- 3. 새 제약 추가
alter table public.goods
  add constraint goods_status_check
    check (status in ('active', 'sold_out', 'draft'));
