-- 023_checkout_hardening.sql
-- 결제 신뢰경계 하드닝. 핵심: "가격·수량·판매가능 여부는 서버만 결정한다."
--
-- 기존 문제
--   1) place_order(020)가 클라이언트가 보낸 p_items[].price로 총액을 계산 → 가격 위조 가능
--   2) 체크아웃 폴백 경로가 브라우저에서 orders/order_items를 직접 insert → 동일하게 위조 가능
--   3) decrement_stock/restore_stock이 소유권 검사 없이 authenticated에 열려 있어 임의 재고 조작 가능
--
-- 해결
--   A) place_order_v2: 클라이언트는 {goods_id, quantity}만 보내고, 가격·상품명·이미지는 goods에서 조회
--   B) cancel_own_order_item: 고객 부분취소를 소유권 검증이 포함된 단일 RPC로 대체
--   C) orders/order_items 직접 INSERT 권한 회수 + 재고 RPC를 앱 롤에서 회수

-- ─────────────────────────────────────────────────────────────
-- A) 주문 생성 — 가격은 서버가 결정
-- ─────────────────────────────────────────────────────────────
create or replace function public.place_order_v2(
  p_items            jsonb,   -- [{goods_id, quantity}, ...]  price/title/image는 무시된다
  p_recipient_name   text,
  p_recipient_phone  text,
  p_shipping_address text,
  p_memo             text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_order_id uuid;
  v_total    numeric := 0;
  v_item     jsonb;
  v_goods_id uuid;
  v_qty      int;
  v_price    numeric;
  v_title    text;
  v_image    text;
  v_affected int;
  v_lines    jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'NO_ITEMS';
  end if;
  if coalesce(btrim(p_recipient_name), '') = ''
     or coalesce(btrim(p_recipient_phone), '') = ''
     or coalesce(btrim(p_shipping_address), '') = '' then
    raise exception 'INVALID_SHIPPING';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_goods_id := (v_item->>'goods_id')::uuid;
    v_qty      := (v_item->>'quantity')::int;

    -- 음수·0·비정상 수량 차단 (음수면 재고가 오히려 늘고 총액이 음수가 된다)
    if v_qty is null or v_qty <= 0 or v_qty > 999 then
      raise exception 'INVALID_QUANTITY';
    end if;

    -- 판매 가능 여부 + 가격/스냅샷을 서버에서 조회 (UI와 동일 공식: round(price * (1 - discount/100)))
    select g.title,
           round(g.price * (1 - coalesce(g.discount_rate, 0)::numeric / 100)),
           (to_jsonb(g.images) ->> 0)          -- text[]/jsonb 양쪽에서 첫 이미지
      into v_title, v_price, v_image
      from public.goods g
     where g.id = v_goods_id
       and coalesce(g.is_active, true)          -- 021: 노출 플래그
       and g.status <> 'draft'
       and (g.published_at is null or g.published_at <= now());
    if not found then
      raise exception 'NOT_PURCHASABLE:%', v_goods_id;
    end if;

    -- 재고 원자적 차감 (부족하면 예외 → 트랜잭션 전체 롤백)
    update public.goods
       set stock_quantity = stock_quantity - v_qty
     where id = v_goods_id
       and stock_quantity >= v_qty;
    get diagnostics v_affected = row_count;
    if v_affected = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', v_title;
    end if;

    v_total := v_total + v_price * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'goods_id',  v_goods_id,
      'title',     v_title,
      'price',     v_price,
      'image_url', v_image,
      'quantity',  v_qty
    );
  end loop;

  insert into public.orders
    (user_id, status, total_amount, recipient_name, recipient_phone, shipping_address, memo)
  values
    (v_user, 'paid', v_total, btrim(p_recipient_name), btrim(p_recipient_phone),
     btrim(p_shipping_address), nullif(btrim(coalesce(p_memo, '')), ''))
  returning id into v_order_id;

  insert into public.order_items (order_id, goods_id, title, price, image_url, quantity)
  select v_order_id,
         (elem->>'goods_id')::uuid,
         elem->>'title',
         (elem->>'price')::numeric,
         elem->>'image_url',
         (elem->>'quantity')::int
    from jsonb_array_elements(v_lines) as elem;

  return v_order_id;
end;
$$;

grant execute on function public.place_order_v2(jsonb, text, text, text, text) to authenticated;

-- 구버전 place_order는 삭제하지 않고 v2로 위임하는 래퍼로 교체한다.
--   · 마이그레이션이 배포보다 먼저 적용돼도 구버전 앱의 체크아웃이 계속 동작한다
--   · 공격자가 place_order를 직접 호출해도 p_items의 price는 무시된다
create or replace function public.place_order(
  p_items            jsonb,
  p_recipient_name   text,
  p_recipient_phone  text,
  p_shipping_address text,
  p_memo             text
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.place_order_v2(p_items, p_recipient_name, p_recipient_phone, p_shipping_address, p_memo);
$$;

grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- B) 고객 부분취소 — 소유권/상태 검증 포함 단일 RPC
--    (restore_stock을 앱 롤에서 회수하므로 대체가 필요하다)
-- ─────────────────────────────────────────────────────────────
create or replace function public.cancel_own_order_item(p_order_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_owner     uuid;
  v_status    text;
  v_goods_id  uuid;
  v_qty       int;
  v_remaining int;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select o.user_id, o.status into v_owner, v_status
    from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_owner <> v_user then
    raise exception 'FORBIDDEN';
  end if;
  if v_status not in ('paid', 'preparing') then
    raise exception 'NOT_CANCELLABLE';
  end if;

  -- status='active' 조건 포함 atomic UPDATE — 동시 요청 시 한 번만 성공(이중 복원 방지)
  update public.order_items
     set status = 'cancelled'
   where id = p_item_id and order_id = p_order_id and status = 'active'
   returning goods_id, quantity into v_goods_id, v_qty;
  if not found then
    raise exception 'ALREADY_CANCELLED';
  end if;

  if v_goods_id is not null then
    update public.goods
       set stock_quantity = stock_quantity + v_qty
     where id = v_goods_id;
  end if;

  -- 남은 active 아이템이 없으면 주문 전체 취소 (이 시점엔 모두 복원 완료 → 트리거는 no-op)
  select count(*) into v_remaining
    from public.order_items
   where order_id = p_order_id and status = 'active';
  if v_remaining = 0 then
    update public.orders set status = 'cancelled' where id = p_order_id;
  end if;
end;
$$;

grant execute on function public.cancel_own_order_item(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- C) 직접 쓰기 경로 차단
--    place_order_v2/cancel_own_order_item은 security definer라 소유자 권한으로 동작 → 영향 없음
-- ─────────────────────────────────────────────────────────────

-- 주문 생성은 place_order_v2를 통해서만 (총액/항목 위조 차단)
revoke insert, delete on public.orders      from anon, authenticated;
revoke insert, delete on public.order_items from anon, authenticated;

-- 재고 RPC: 소유권 검사가 없으므로 앱 롤에서 회수.
-- PostgreSQL은 함수 EXECUTE를 기본적으로 PUBLIC에 부여하므로 PUBLIC까지 회수해야 한다.
revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;

-- restore_stock 회수는 024로 분리했다.
-- 구버전 앱의 부분취소가 restore_stock을 직접 호출하고 그 에러를 무시하기 때문에,
-- 배포 전에 회수하면 "아이템은 취소됐는데 재고는 복원 안 됨"이 조용히 발생한다.
-- 실행 순서: 023 적용 → 앱 배포 → 024 적용

-- PostgREST 스키마 캐시 갱신
notify pgrst, 'reload schema';
