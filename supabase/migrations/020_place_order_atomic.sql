-- 020_place_order_atomic.sql
-- E. 원자성: 재고차감 + 주문생성 + 주문항목 생성을 단일 트랜잭션(plpgsql 함수)으로 처리.
--    중간 실패나 클라이언트 크래시 시 전체 롤백 → 재고/주문 불일치 원천 차단.
--    재고 부족 시 INSUFFICIENT_STOCK 예외로 전체 롤백.

drop function if exists public.place_order(jsonb, text, text, text, text);

create function public.place_order(
  p_items           jsonb,   -- [{goods_id, title, price, image_url, quantity}, ...]
  p_recipient_name  text,
  p_recipient_phone text,
  p_shipping_address text,
  p_memo            text
)
returns uuid                 -- 생성된 주문 id
language plpgsql
security definer
as $$
declare
  v_user     uuid := auth.uid();
  v_order_id uuid;
  v_total    numeric := 0;
  v_item     jsonb;
  v_goods_id uuid;
  v_qty      int;
  v_price    numeric;
  v_affected int;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'NO_ITEMS';
  end if;

  -- 1) 재고 원자적 차감 (부족하면 예외 → 트랜잭션 전체 롤백)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_goods_id := (v_item->>'goods_id')::uuid;
    v_qty      := (v_item->>'quantity')::int;
    v_price    := (v_item->>'price')::numeric;
    v_total    := v_total + v_price * v_qty;

    update public.goods
      set stock_quantity = stock_quantity - v_qty
      where id = v_goods_id and stock_quantity >= v_qty;
    get diagnostics v_affected = row_count;
    if v_affected = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', coalesce(v_item->>'title', v_goods_id::text);
    end if;
  end loop;

  -- 2) 주문 생성 (총액은 서버에서 재계산)
  insert into public.orders (user_id, status, total_amount, recipient_name, recipient_phone, shipping_address, memo)
    values (v_user, 'paid', v_total, p_recipient_name, p_recipient_phone, p_shipping_address, nullif(p_memo, ''))
    returning id into v_order_id;

  -- 3) 주문 항목 생성
  insert into public.order_items (order_id, goods_id, title, price, image_url, quantity)
    select v_order_id,
           (elem->>'goods_id')::uuid,
           elem->>'title',
           (elem->>'price')::numeric,
           elem->>'image_url',
           (elem->>'quantity')::int
    from jsonb_array_elements(p_items) as elem;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(jsonb, text, text, text, text) to authenticated;
