-- 관리자 role 확인 헬퍼 함수
create or replace function public.is_admin()
returns boolean as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$ language sql stable;

-- goods: 관리자 전체 접근 (insert, update, delete)
create policy "goods_admin_all" on public.goods
  using (public.is_admin()) with check (public.is_admin());

-- orders: 관리자 전체 조회
create policy "orders_admin_select" on public.orders
  for select using (public.is_admin());

-- orders: 관리자 상태 수정
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

-- profiles: 관리자 전체 조회
create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

-- goods_wishlist: 관리자 조회
create policy "goods_wishlist_admin_select" on public.goods_wishlist
  for select using (public.is_admin());
