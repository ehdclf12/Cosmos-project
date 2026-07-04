-- 022_orders_shipping.sql
-- 배송/송장 관리: 택배사 코드 + 송장번호. 둘 다 nullable(기존 주문은 null → 배송정보 미표시).

alter table public.orders
  add column if not exists courier text,
  add column if not exists tracking_number text;
