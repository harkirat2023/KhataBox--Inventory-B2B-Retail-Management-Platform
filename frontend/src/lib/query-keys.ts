export const queryKeys = {
  dashboard: {
    stats: (storeId?: number | null) => ['dashboard', 'stats', storeId] as const,
    stores: () => ['stores', 'list'] as const,
  },
  products: {
    list: (filters?: Record<string, unknown>) => ['products', 'list', filters] as const,
    detail: (id: number) => ['products', id] as const,
    lowStock: () => ['products', 'low-stock'] as const,
  },
  orders: {
    list: (filters?: Record<string, unknown>) => ['orders', 'list', filters] as const,
    detail: (id: number) => ['orders', id] as const,
    myOrders: () => ['orders', 'my-orders'] as const,
  },
  customers: {
    list: (filters?: Record<string, unknown>) => ['customers', 'list', filters] as const,
    myCart: () => ['customer', 'cart'] as const,
  },
  catalog: {
    products: (search?: string) => ['catalog', 'products', search] as const,
  },
  suppliers: {
    list: (filters?: Record<string, unknown>) => ['suppliers', 'list', filters] as const,
  },
  inventory: {
    movements: (filters?: Record<string, unknown>) => ['inventory', 'movements', filters] as const,
  },
}
