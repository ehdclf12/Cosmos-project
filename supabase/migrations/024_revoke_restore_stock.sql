-- 024_revoke_restore_stock.sql
-- ⚠️ 023을 적용하고 앱을 배포한 "다음"에 실행할 것.
--
-- restore_stock은 소유권 검사가 없어 로그인한 누구나 임의 상품의 재고를 무한히 늘릴 수 있다.
-- 023에서 고객 부분취소를 cancel_own_order_item(소유권·상태 검증 포함)으로 옮겼으므로,
-- 새 앱이 배포된 뒤에는 앱 롤에서 이 함수를 회수해도 된다.
--
-- 구버전 앱이 아직 떠 있는 상태에서 먼저 실행하면, 구버전 부분취소가 restore_stock 에러를
-- 무시하고 넘어가기 때문에 "아이템 취소는 됐는데 재고 복원은 안 됨"이 조용히 발생한다.

revoke execute on function public.restore_stock(uuid, integer) from public, anon, authenticated;

-- 관리자 부분취소(서비스 롤)는 restore_stock을 계속 사용한다
grant execute on function public.restore_stock(uuid, integer) to service_role;

notify pgrst, 'reload schema';
