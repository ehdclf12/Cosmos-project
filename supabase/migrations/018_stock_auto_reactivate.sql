-- 018_stock_auto_reactivate.sql
-- 재고 로직 보정 (A·C):
--   A. 재고가 0에서 다시 채워지면(취소 복원·관리자 재입고) sold_out → active 자동 복원
--   C. 신규 등록(INSERT) 시에도 재고 0이면 active → sold_out 자동 처리
-- (기존 auto_sold_out은 UPDATE만, 0→sold_out 단방향이었음)

create or replace function public.auto_sold_out_on_stock()
returns trigger as $$
begin
  if new.stock_quantity = 0 and new.status = 'active' then
    new.status := 'sold_out';                 -- 재고 소진 → 품절
  elsif new.stock_quantity > 0 and new.status = 'sold_out' then
    new.status := 'active';                    -- 재입고 → 자동 재판매
  end if;
  return new;
end;
$$ language plpgsql;

-- 기존 UPDATE 트리거는 그대로 유지(재확인용 재생성)
drop trigger if exists goods_auto_sold_out on public.goods;
create trigger goods_auto_sold_out
  before update of stock_quantity on public.goods
  for each row execute function public.auto_sold_out_on_stock();

-- INSERT 시에도 적용 (신규 등록 재고 0 → sold_out)
drop trigger if exists goods_auto_sold_out_insert on public.goods;
create trigger goods_auto_sold_out_insert
  before insert on public.goods
  for each row execute function public.auto_sold_out_on_stock();

-- 1회성 백필: 지금까지 재고 복원됐지만 sold_out으로 묶여있던 상품 복구
-- (status만 바꾸므로 'before update of stock_quantity' 트리거는 미발동)
update public.goods
  set status = 'active'
  where status = 'sold_out' and stock_quantity > 0;
