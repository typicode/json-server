export const WHERE_OPERATORS = ['lt', 'lte', 'gt', 'gte', 'eq', 'ne', 'in'] as const

export type WhereOperator = (typeof WHERE_OPERATORS)[number]

export function isWhereOperator(value: string): value is WhereOperator {
  return (WHERE_OPERATORS as readonly string[]).includes(value)
}
