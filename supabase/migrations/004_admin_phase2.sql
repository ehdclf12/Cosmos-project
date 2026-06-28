-- supabase/migrations/004_admin_phase2.sql

-- 1. goods: 재고 수량 컬럼 추가
alter table public.goods
  add column if not exists stock_quantity integer not null default 0
    check (stock_quantity >= 0);

-- 2. 재고 0 → sold_out 자동 전환 트리거
create or replace function public.auto_sold_out_on_stock()
returns trigger as $$
begin
  if new.stock_quantity = 0 and new.status = 'active' then
    new.status := 'sold_out';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists goods_auto_sold_out on public.goods;
create trigger goods_auto_sold_out
  before update of stock_quantity on public.goods
  for each row execute function public.auto_sold_out_on_stock();

-- 3. orders: status check constraint 확장
--    기존 제약 이름은 Supabase 대시보드에서 확인 후 동일하게 처리
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('paid', 'preparing', 'shipping', 'delivered', 'cancelled'));
