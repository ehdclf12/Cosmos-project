# Order System Design

**Date:** 2026-06-09  
**Scope:** orders / order_items 테이블, 장바구니(localStorage), 구매 플로우, 마이페이지 주문 탭

---

## 1. 목표

Goods 상세 페이지에서 상품을 장바구니에 담고, Checkout 페이지에서 수령인 정보를 입력한 뒤 주문을 완료한다. 주문 기록은 Supabase에 저장되며 마이페이지 주문 내역 탭에서 조회할 수 있다.

---

## 2. 결정 사항

| 항목 | 결정 |
|------|------|
| 결제 처리 | Mock (PG 연동 없음, "주문하기" 클릭 시 즉시 paid 상태로 저장) |
| 장바구니 저장소 | Zustand + localStorage (클라이언트 전용) |
| 체크아웃 UI | 전용 `/checkout` 페이지 |
| 수집 정보 | 수령인명, 연락처, 배송지 주소, 메모(선택) |
| 주문 단위 | 장바구니 — 여러 상품을 한 번에 주문 가능 |

---

## 3. DB 스키마

### orders

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'paid'
    check (status in ('paid', 'cancelled')),
  total_amount integer not null,
  recipient_name text not null,
  recipient_phone text not null,
  shipping_address text not null,
  memo text,
  created_at timestamptz default now()
);

alter table orders enable row level security;
create policy "orders_select_own" on orders for select using (auth.uid() = user_id);
create policy "orders_insert_own" on orders for insert with check (auth.uid() = user_id);
```

### order_items

```sql
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  goods_id uuid references goods(id) on delete set null,
  title text not null,
  price integer not null,
  image_url text,
  quantity integer not null default 1,
  created_at timestamptz default now()
);

alter table order_items enable row level security;
create policy "order_items_select_own" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
create policy "order_items_insert_own" on order_items
  for insert with check (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
```

**설계 원칙:**
- `title`, `price`, `image_url`은 구매 시점 스냅샷 — goods 변경에 영향받지 않음
- `goods_id`는 SET NULL (상품 삭제 시 주문 기록 보존)
- `status`는 `paid` / `cancelled` 2단계만 (Mock 결제이므로 pending 불필요)

---

## 4. 장바구니 상태

**저장소:** `apps/web/lib/cart-store.ts` (Zustand + persist → localStorage)

```typescript
interface CartItem {
  goodsId: string
  title: string
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void  // 동일 goodsId면 수량 +1
  removeItem: (goodsId: string) => void
  updateQuantity: (goodsId: string, quantity: number) => void
  clear: () => void
  totalAmount: () => number  // sum(price * quantity)
  totalCount: () => number   // sum(quantity)
}
```

---

## 5. 컴포넌트 & 페이지

### 새로 생성

| 경로 | 역할 |
|------|------|
| `apps/web/lib/cart-store.ts` | Zustand 장바구니 스토어 |
| `apps/web/app/goods/_components/AddToCartButton.tsx` | "장바구니 담기" 클라이언트 버튼 |
| `apps/web/app/checkout/page.tsx` | 체크아웃 페이지 (주문 폼 + 장바구니 요약) |
| `apps/web/app/orders/[id]/page.tsx` | 주문 완료 확인 페이지 |
| `apps/web/app/mypage/orders/page.tsx` | 마이페이지 주문 내역 탭 |

### 수정

| 경로 | 변경 내용 |
|------|-----------|
| `apps/web/app/goods/[id]/page.tsx` | `AddToCartButton` 추가 (WishlistButton 위) |
| `apps/web/app/landing/LandingHeader.tsx` | 장바구니 아이콘 + 개수 뱃지 |
| `apps/web/app/mypage/_components/MypageSidebar.tsx` | "주문 내역" 항목 추가 |

---

## 6. 구매 플로우 (상세)

```
[Goods 상세 /goods/[id]]
  ├─ status === 'available' → AddToCartButton 표시
  │    └─ 클릭 → cartStore.addItem() → 헤더 뱃지 갱신
  └─ status === 'sold_out' → 버튼 비활성

[헤더 장바구니 아이콘]
  └─ totalCount > 0 → 빨간 뱃지 표시
  └─ 클릭 → /checkout 이동

[/checkout]
  ├─ 비로그인 → /login 리다이렉트
  ├─ 장바구니 비어있음 → /goods 리다이렉트
  ├─ 주문 요약: 담긴 상품 목록 + 합계
  └─ 폼: 수령인명 / 연락처 / 배송지 / 메모(선택)
       └─ [주문하기] 클릭
            ├─ Supabase: INSERT orders → orderId 취득
            ├─ Supabase: INSERT order_items (각 CartItem → 1행)
            ├─ cartStore.clear()
            └─ router.push(`/orders/${orderId}`)

[/orders/[id]]
  └─ 주문 번호, 상품 목록, 배송지, 합계 표시
  └─ [계속 쇼핑하기] → /goods

[/mypage/orders]
  └─ 내 주문 목록 (최신순)
  └─ 각 행: 날짜 | 상품명(외 N건) | 합계 | 상태
  └─ 클릭 → /orders/[id]
```

---

## 7. 비로그인 처리

- `/checkout`: 서버 컴포넌트에서 인증 체크 → 비로그인 시 `/login` 리다이렉트
- `AddToCartButton`: 장바구니 담기는 허용, `/checkout` 진입 시 로그인 요구

---

## 8. 제외 범위 (향후)

- 실제 PG 결제 (PortOne/Toss)
- 주문 취소 API
- 재고 차감 로직
- 배송 추적
- DB 장바구니 (다기기 동기화)
