import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { addFavorite, listFavorites, removeFavorite } from '../api/favorites'
import type { FavoriteOut } from '../api/types'
import { useI18n } from '../i18n'
import { useAuth } from './useAuth'

type FavoritesApi = {
  items: FavoriteOut[]
  loading: boolean
  /** 收藏數量上限（後端給的，不要寫死）。 */
  limit: number
  isFavorite: (productId: string) => boolean
  /** 加入收藏。失敗時把錯誤丟出來（例如 favorite_limit_reached）。 */
  add: (product: { id: string; slug: string }) => Promise<void>
  remove: (product: { id: string; slug: string }) => Promise<void>
  /** 批次取消收藏：逐筆送 DELETE，回報實際成功的筆數。 */
  removeMany: (products: { id: string; slug: string }[]) => Promise<number>
  reload: () => Promise<void>
}

const FavoritesCtx = createContext<FavoritesApi | null>(null)

const DEFAULT_LIMIT = 30

/**
 * 收藏狀態集中在這裡，原因是「這個作物收藏了沒」在好幾個畫面都要用
 * （作物詳情的選項、收藏清單、首頁），而清單本身不分頁、最多 30 筆，
 * 一次抓回來放著最省往返——API.md 4.9 也是這樣建議的。
 *
 * 未登入完全不打 API：收藏是登入後的功能，訪客瀏覽維持零成本。
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  // 收藏清單帶的是品項名稱，換語言要重抓（後端依 Accept-Language 回名稱）
  const { locale } = useI18n()
  const userId = auth.user?.id ?? null
  const [items, setItems] = useState<FavoriteOut[]>([])
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [loading, setLoading] = useState(false)
  // 換使用者／登出後才回來的回應要丟掉，否則會把別人的收藏畫在畫面上
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    if (userId === null) {
      setItems([])
      return
    }
    const id = ++requestId.current
    setLoading(true)
    try {
      const page = await listFavorites()
      if (id !== requestId.current) return
      setItems(page.items)
      setLimit(page.limit)
    } catch {
      // 收藏拿不到不該擋住任何畫面，維持上一份（或空的）就好
      if (id === requestId.current) setItems([])
    } finally {
      if (id === requestId.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, locale])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = useCallback(async (product: { id: string; slug: string }) => {
    const favorite = await addFavorite(product.slug)
    // PUT 是冪等的，重複加入不會變兩筆，本地也要跟著去重
    setItems((current) => [favorite, ...current.filter((f) => f.product.id !== product.id)])
  }, [])

  const remove = useCallback(async (product: { id: string; slug: string }) => {
    await removeFavorite(product.slug)
    setItems((current) => current.filter((f) => f.product.id !== product.id))
  }, [])

  const removeMany = useCallback(async (products: { id: string; slug: string }[]) => {
    // 沒有批次端點，逐筆送；用 allSettled 讓其中一筆失敗不影響其他筆
    const results = await Promise.allSettled(products.map((p) => removeFavorite(p.slug)))
    const removed = new Set(
      products.filter((_, i) => results[i].status === 'fulfilled').map((p) => p.id),
    )
    setItems((current) => current.filter((f) => !removed.has(f.product.id)))
    return removed.size
  }, [])

  const api = useMemo<FavoritesApi>(
    () => ({
      items,
      loading,
      limit,
      isFavorite: (productId: string) => items.some((f) => f.product.id === productId),
      add,
      remove,
      removeMany,
      reload,
    }),
    [items, loading, limit, add, remove, removeMany, reload],
  )

  return <FavoritesCtx.Provider value={api}>{children}</FavoritesCtx.Provider>
}

export function useFavorites(): FavoritesApi {
  const ctx = useContext(FavoritesCtx)
  if (ctx === null) throw new Error('useFavorites 必須在 <FavoritesProvider> 內使用')
  return ctx
}
