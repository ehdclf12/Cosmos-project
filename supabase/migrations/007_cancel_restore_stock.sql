-- 007_cancel_restore_stock.sql
-- orders.status가 cancelled로 변경될 때 order_items 기반으로 재고 복원

create or replace function public.restore_stock_on_cancel()
returns trigger as $$
begin
  -- 새 상태가 cancelled이고, 이전 상태가 이미 cancelled가 아닐 때만 실행 (중복 원복 방지)
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.goods g
    set stock_quantity = g.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = new.id
      and oi.goods_id = g.id
      and oi.goods_id is not null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists orders_restore_stock_on_cancel on public.orders;
create trigger orders_restore_stock_on_cancel
  after update of status on public.orders
  for each row execute function public.restore_stock_on_cancel();
