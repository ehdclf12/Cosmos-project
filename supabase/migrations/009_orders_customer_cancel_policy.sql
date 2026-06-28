-- 009_orders_customer_cancel_policy.sql
-- 고객이 자신의 주문을 cancelled로 변경할 수 있는 RLS 정책 추가
-- USING: paid/preparing 상태인 본인 주문만 대상
-- WITH CHECK: 새 상태는 반드시 cancelled만 허용

create policy "orders_cancel_own" on public.orders
  for update
  using (auth.uid() = user_id and status in ('paid', 'preparing'))
  with check (status = 'cancelled');
