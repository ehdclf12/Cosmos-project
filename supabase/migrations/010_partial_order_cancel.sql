-- order_items 에 status 컬럼 추가 (개별 상품 취소)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'cancelled'));

-- 개별 아이템 취소 시 재고 복원 함수
CREATE OR REPLACE FUNCTION restore_stock(p_goods_id uuid, p_quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE goods SET stock_quantity = stock_quantity + p_quantity WHERE id = p_goods_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION restore_stock(uuid, integer) TO authenticated;

-- 고객이 자신의 주문 아이템을 취소할 수 있는 RLS 정책
CREATE POLICY "order_items_cancel_own" ON public.order_items
  FOR UPDATE
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
        AND orders.status IN ('paid', 'preparing')
    )
  )
  WITH CHECK (status = 'cancelled');

-- order_items SELECT: 본인 주문 아이템 조회 허용
CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- 주문 전체 취소 트리거: 이미 개별 취소된 아이템은 제외하고 재고 복원
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- 개별 취소(cancelled)된 아이템은 이미 재고 복원됐으므로 active 것만 처리
    UPDATE goods g
    SET stock_quantity = g.stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.status = 'active';

  ELSIF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    -- 주문 복구 시: active 아이템의 재고 재차감
    UPDATE goods g
    SET stock_quantity = GREATEST(0, g.stock_quantity - oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
