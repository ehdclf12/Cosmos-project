-- 트리거 함수 재확인: active 아이템만 재고 복원 (이전 버전이 DB에 남아있을 경우 대비)
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- 이미 개별 취소된(status='cancelled') 아이템은 제외, active만 복원
    UPDATE goods g
    SET stock_quantity = g.stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.status = 'active';

  ELSIF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    -- 주문 복구 시: active 아이템 재고 재차감
    UPDATE goods g
    SET stock_quantity = GREATEST(0, g.stock_quantity - oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
