import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  goodsId: string
  title: string
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (goodsId: string) => void
  updateQuantity: (goodsId: string, quantity: number) => void
  clear: () => void
  totalAmount: () => number
  totalCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.goodsId === item.goodsId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.goodsId === item.goodsId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        }),

      removeItem: (goodsId) =>
        set((state) => ({ items: state.items.filter((i) => i.goodsId !== goodsId) })),

      updateQuantity: (goodsId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.goodsId !== goodsId)
              : state.items.map((i) => (i.goodsId === goodsId ? { ...i, quantity } : i)),
        })),

      clear: () => set({ items: [] }),

      totalAmount: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'cosmos-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
