-- 006_fix_admin_access.sql

-- 1. order_items: 관리자 조회 권한 추가
create policy "order_items_admin_select" on public.order_items
  for select using (public.is_admin());

-- 2. 재고 차감 함수 (security definer — 일반 인증 유저가 호출 가능, goods RLS 우회)
create or replace function public.decrement_stock(p_goods_id uuid, p_quantity integer)
returns void
language sql
security definer
as $$
  update public.goods
  set stock_quantity = greatest(0, stock_quantity - p_quantity)
  where id = p_goods_id;
$$;

grant execute on function public.decrement_stock to authenticated;
