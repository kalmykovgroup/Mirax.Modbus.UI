export type FilterOp =
    | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'between' | 'in' | 'nin'
    | 'like' | 'ilike'
    | 'isnull' | 'notnull';