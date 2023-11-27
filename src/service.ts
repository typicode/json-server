import { randomBytes } from 'node:crypto'

import { getProperty } from 'dot-prop'
import inflection from 'inflection'
import { Low } from 'lowdb'
import sortOn from 'sort-on'

export type Item = {
  id: string
  [key: string]: unknown
}
export type Headers = Record<string, string>

export type Data = { [key: string]: Item[] }

function isItem(obj: unknown): obj is Item {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const item = obj as Record<string, unknown>
  return (
    'id' in item &&
    typeof item['id'] === 'string' &&
    Object.keys(item).every(
      (key) => key === 'id' || typeof item[key] !== 'function',
    )
  )
}

export function isData(obj: unknown): obj is Record<string, Item[]> {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const data = obj as Record<string, unknown>
  return Object.values(data).every(
    (value) => Array.isArray(value) && value.every(isItem),
  )
}

enum Operator {
  lt = 'lt',
  lte = 'lte',
  gt = 'gt',
  gte = 'gte',
  ne = 'ne',
  default = '',
}

export type PaginatedItems = {
  first: number
  prev: number | null
  next: number | null
  last: number
  pages: number
  items: number
  data: Item[]
}

function isOperator(value: string): value is Operator {
  return Object.values<string>(Operator).includes(value)
}

type Condition = {
  [key: string]: [Operator, string | string[]]
}

function include(
  db: Low<Data>,
  name: string,
  item: Item,
  related: string,
): Item {
  if (inflection.singularize(related) === related) {
    const relatedData = db.data[inflection.pluralize(related)] as Item[]
    if (!relatedData) {
      return item
    }
    const foreignKey = `${related}Id`
    const relatedItem = relatedData.find((relatedItem: Item) => {
      return relatedItem.id === item[foreignKey]
    })
    return { ...item, [related]: relatedItem }
  }
  const relatedData: Item[] = db.data[related] as Item[]

  if (!relatedData) {
    return item
  }

  const foreignKey = `${inflection.singularize(name)}Id`
  const relatedItems = relatedData.filter(
    (relatedItem: Item) => relatedItem[foreignKey] === item.id,
  )

  return { ...item, [related]: relatedItems }
}

function nullifyForeignKey(db: Low<Data>, name: string, id: string) {
  const foreignKey = `${inflection.singularize(name)}Id`

  Object.entries(db.data).forEach(([key, items]) => {
    // Skip
    if (key === name) return

    // Nullify
    items.forEach((item) => {
      if (item[foreignKey] === id) {
        item[foreignKey] = null
      }
    })
  })
}

function deleteDependents(db: Low<Data>, name: string, dependents: string[]) {
  const foreignKey = `${inflection.singularize(name)}Id`

  Object.entries(db.data).forEach(([key, items]) => {
    // Skip
    if (key === name || !dependents.includes(key)) return

    // Delete if foreign key is null
    db.data[key] = items.filter((item) => item[foreignKey] !== null)
  })
}

export class Service {
  #db: Low<Data>

  constructor(db: Low<Data>) {
    this.#db = db
  }

  #get(name: string): Item[] | undefined {
    return this.#db.data[name]
  }

  list(): string[] {
    return Object.keys(this.#db?.data || {})
  }

  has(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#db?.data, name)
  }

  findById(
    name: string,
    id: string,
    query: { _include?: string[] },
  ): Item | undefined {
    let item = this.#get(name)?.find((item) => item.id === id)
    query._include?.forEach((related) => {
      if (item !== undefined) item = include(this.#db, name, item, related)
    })
    return item
  }

  find(
    name: string,
    query: {
      [key: string]: unknown
    } & {
      _include?: string[]
      _sort?: string
      _start?: number
      _end?: number
      _limit?: number
      _page?: number
      _per_page?: number
    } = {},
  ): Item[] | PaginatedItems | undefined {
    let items = this.#get(name)

    // Not found
    if (items === undefined) return

    // Include
    query._include?.forEach((related) => {
      if (items !== undefined)
        items = items.map((item) => include(this.#db, name, item, related))
    })

    // Return list if no query params
    if (Object.keys(query).length === 0) {
      return items
    }

    // Convert query params to conditions
    const conds: Condition = {}
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || typeof value !== 'string') {
        continue
      }
      const re = /_(lt|lte|gt|gte|ne)$/
      const reArr = re.exec(key)
      const op = reArr?.at(1)
      if (op && isOperator(op)) {
        const field = key.replace(re, '')
        conds[field] = [op, value]
        continue
      }
      if (
        ['_sort', '_start', '_end', '_limit', '_page', '_per_page'].includes(
          key,
        )
      )
        continue
      conds[key] = [Operator.default, value]
    }

    // Loop through conditions and filter items
    const res = items.filter((item: Item) => {
      for (const [key, [op, paramValue]] of Object.entries(conds)) {
        if (paramValue && !Array.isArray(paramValue)) {
          const itemValue = getProperty(item, key)
          switch (op) {
            // item_gt=value
            case Operator.gt: {
              if (
                !(
                  typeof itemValue === 'number' &&
                  itemValue > parseInt(paramValue)
                )
              ) {
                return false
              }
              break
            }
            // item_gte=value
            case Operator.gte: {
              if (
                !(
                  typeof itemValue === 'number' &&
                  itemValue >= parseInt(paramValue)
                )
              ) {
                return false
              }
              break
            }
            // item_lt=value
            case Operator.lt: {
              if (
                !(
                  typeof itemValue === 'number' &&
                  itemValue < parseInt(paramValue)
                )
              ) {
                return false
              }
              break
            }
            // item_lte=value
            case Operator.lte: {
              if (
                !(
                  typeof itemValue === 'number' &&
                  itemValue <= parseInt(paramValue)
                )
              ) {
                return false
              }
              break
            }
            // item_ne=value
            case Operator.ne: {
              if (!(itemValue != paramValue)) return false
              break
            }
            // item=value
            case Operator.default: {
              if (!(itemValue == paramValue)) return false
            }
          }
        }
      }
      return true
    })
    const sort = query._sort || ''
    const sorted = sortOn(res, sort.split(','))
    const start = query._start
    const end = query._end
    const limit = query._limit
    if (start === undefined && limit) {
      return sorted.slice(0, limit)
    }
    if (start && limit) {
      return sorted.slice(start, start + limit)
    }
    let page = query._page
    const perPage = query._per_page || 10
    if (page) {
      const items = sorted.length
      const pages = Math.ceil(items / perPage)

      // Ensure page is within the valid range
      page = Math.max(1, Math.min(page, pages))

      const first = 1
      const prev = page > 1 ? page - 1 : null
      const next = page < pages ? page + 1 : null
      const last = pages

      const start = (page - 1) * perPage
      const end = start + perPage
      const data = sorted.slice(start, end)

      return {
        first,
        prev,
        next,
        last,
        pages,
        items,
        data,
      }
    }
    return sorted.slice(start, end)
  }

  async create(
    name: string,
    data: Omit<Item, 'id'> = {},
  ): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined) return
    const nextData = { id: randomBytes(2).toString('hex'), ...data }
    items.push(nextData)
    await this.#db.write()
    return nextData
  }

  async update(
    name: string,
    id: string,
    body: Omit<Item, 'id'> = {},
  ): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined) return

    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return

    const item = items.at(index)
    if (item) {
      const nextItem = { ...body, id: item.id }
      items.splice(index, 1, nextItem)
      await this.#db.write()
      return nextItem
    }
    return
  }

  async patch(
    name: string,
    id: string,
    body: Omit<Item, 'id'> = {},
  ): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined) return

    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return

    const item = items.at(index)
    if (item) {
      const nextItem = { ...item, ...body, id: item.id }
      items.splice(index, 1, nextItem)
      await this.#db.write()
      return nextItem
    }
    return
  }

  async destroy(
    name: string,
    id: string,
    dependents: string[] = [],
  ): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined) return

    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    const item = items.splice(index, 1)[0]

    nullifyForeignKey(this.#db, name, id)
    deleteDependents(this.#db, name, dependents)

    await this.#db.write()
    return item
  }
}
