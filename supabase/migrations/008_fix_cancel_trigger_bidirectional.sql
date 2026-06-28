-- 008_fix_cancel_trigger_bidirectional.sql
-- 트리거 함수를 양방향으로 업데이트:
--   active → cancelled : 재고 복원 (기존)
--   cancelled → active : 재고 재차감 (신규)

create or replace function public.restore_stock_on_cancel()
returns trigger as $$
begin
  -- active → cancelled: 재고 복원
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.goods g
    set stock_quantity = g.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = new.id
      and oi.goods_id = g.id
      and oi.goods_id is not null;
  end if;

  -- cancelled → active: 재고 재차감 (관리자가 취소를 되돌릴 때)
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.goods g
    set stock_quantity = greatest(0, g.stock_quantity - oi.quantity)
    from public.order_items oi
    where oi.order_id = new.id
      and oi.goods_id = g.id
      and oi.goods_id is not null;
  end if;

  return new;
end;
$$ language plpgsql security definer;
