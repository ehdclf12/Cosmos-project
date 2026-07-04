-- 019_oversell_prevention.sql
-- B. 초과판매 방지: decrement_stock을 "재고가 충분할 때만" 차감하고 성공 여부를 반환.
--    (기존: greatest(0, 재고-수량) — 음수만 막고 부족해도 주문을 막지 못함)
-- 호출부(체크아웃)는 반환값 false면 주문을 만들지 않고 롤백한다.

-- 반환 타입(void → boolean) 변경이라 create or replace로는 안 되고 먼저 DROP 필요
drop function if exists public.decrement_stock(uuid, integer);

create function public.decrement_stock(p_goods_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
as $$
declare
  affected int;
begin
  update public.goods
    set stock_quantity = stock_quantity - p_quantity
    where id = p_goods_id
      and stock_quantity >= p_quantity;   -- 재고 충분할 때만 차감 (초과판매 차단)
  get diagnostics affected = row_count;
  return affected > 0;                     -- true=차감 성공, false=재고 부족
end;
$$;

grant execute on function public.decrement_stock(uuid, integer) to authenticated;
