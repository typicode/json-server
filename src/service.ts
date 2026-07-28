import inflection from 'inflection'
import { Low } from 'lowdb'
import sortOn from 'sort-on'
import type { JsonObject } from 'type-fest'

import { matchesWhere } from './matches-where.ts'
import { paginate, type PaginationResult } from './paginate.ts'
import { randomId } from './random-id.ts'
export type Item = Record<string, unknown>

export type Data = Record<string, Item[] | Item>

export function isItem(obj: unknown): obj is Item {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
}

export type PaginatedItems = PaginationResult<Item>

function ensureArray(arg: string | string[] = []): string[] {
  return Array.isArray(arg) ? arg : [arg]
}

function embed(db: Low<Data>, name: string, item: Item, related: string): Item {
  if (inflection.singularize(related) === related) {
    const relatedData = db.data[inflection.pluralize(related)] as Item[]
    if (!relatedData) {
      return item
    }
    const foreignKey = `${related}Id`
    const relatedItem = relatedData.find((relatedItem: Item) => {
      return relatedItem['id'] === item[foreignKey]
    })
    return { ...item, [related]: relatedItem }
  }
  const relatedData: Item[] = db.data[related] as Item[]

  if (!relatedData) {
    return item
  }

  const foreignKey = `${inflection.singularize(name)}Id`
  const relatedItems = relatedData.filter(
    (relatedItem: Item) => relatedItem[foreignKey] === item['id'],
  )

  return { ...item, [related]: relatedItems }
}

function foreignKeyOf(name: string): string {
  return `${inflection.singularize(name)}Id`
}

// Ids removed from each resource, so that a dependent can be matched against
// every resource deleted so far and not just against the requested one
type DeletedIds = Map<string, Set<string>>

function isDependentOf(item: Item, deleted: DeletedIds): boolean {
  for (const [name, ids] of deleted) {
    const value = item[foreignKeyOf(name)]
    if (typeof value === 'string' && ids.has(value)) return true
  }

  return false
}

function nullifyForeignKeys(db: Low<Data>, deleted: DeletedIds) {
  Object.entries(db.data).forEach(([key, items]) => {
    if (!Array.isArray(items)) return

    for (const [name, ids] of deleted) {
      // Skip
      if (key === name) continue

      // Nullify
      const foreignKey = foreignKeyOf(name)
      items.forEach((item) => {
        const value = item[foreignKey]
        if (typeof value === 'string' && ids.has(value)) {
          item[foreignKey] = null
        }
      })
    }
  })
}

function deleteDependents(db: Low<Data>, name: string, deleted: DeletedIds, dependents: string[]) {
  // A dependent can itself be the parent of another one, so keep going until
  // nothing new is deleted. A chain can be at most as deep as the number of
  // dependents, and this makes the result independent of the order they are
  // listed in.
  for (let pass = 0; pass < dependents.length; pass++) {
    let deletedAny = false

    for (const dependent of dependents) {
      const items = db.data[dependent]

      // Skip
      if (dependent === name || !Array.isArray(items)) continue

      // Delete items related to an already deleted one
      const ids = deleted.get(dependent) ?? new Set<string>()
      db.data[dependent] = items.filter((item) => {
        if (!isDependentOf(item, deleted)) return true

        deletedAny = true
        if (typeof item['id'] === 'string') ids.add(item['id'])
        return false
      })
      deleted.set(dependent, ids)
    }

    if (!deletedAny) break
  }
}

export class Service {
  #db: Low<Data>

  constructor(db: Low<Data>) {
    this.#db = db
  }

  #get(name: string): Item[] | Item | undefined {
    return this.#db.data[name]
  }

  has(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#db?.data, name)
  }

  findById(name: string, id: string, query: { _embed?: string[] | string }): Item | undefined {
    const value = this.#get(name)

    if (Array.isArray(value)) {
      let item = value.find((item) => item['id'] === id)
      ensureArray(query._embed).forEach((related) => {
        if (item !== undefined) item = embed(this.#db, name, item, related)
      })
      return item
    }

    return
  }

  find(
    name: string,
    opts: {
      where: JsonObject
      sort?: string
      page?: number
      perPage?: number
      embed?: string | string[]
    },
  ): Item[] | PaginatedItems | Item | undefined {
    const items = this.#get(name)

    if (!Array.isArray(items)) {
      return items
    }

    let results = items

    // Include
    ensureArray(opts.embed).forEach((related) => {
      results = results.map((item) => embed(this.#db, name, item, related))
    })

    results = results.filter((item) => matchesWhere(item as JsonObject, opts.where))
    if (opts.sort) {
      results = sortOn(results, opts.sort.split(','))
    }

    if (opts.page !== undefined) {
      return paginate(results, opts.page, opts.perPage ?? 10)
    }

    return results
  }

  async create(name: string, data: Omit<Item, 'id'> = {}): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined || !Array.isArray(items)) return

    const item = { ...data, id: randomId() }
    items.push(item)

    await this.#db.write()
    return item
  }

  async #updateOrPatch(name: string, body: Item = {}, isPatch: boolean): Promise<Item | undefined> {
    const item = this.#get(name)
    if (item === undefined || Array.isArray(item)) return

    const nextItem = (this.#db.data[name] = isPatch ? { ...item, ...body } : body)

    await this.#db.write()
    return nextItem
  }

  async #updateOrPatchById(
    name: string,
    id: string,
    body: Item = {},
    isPatch: boolean,
  ): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined || !Array.isArray(items)) return

    const item = items.find((item) => item['id'] === id)
    if (!item) return

    const nextItem = isPatch ? { ...item, ...body, id } : { ...body, id }
    const index = items.indexOf(item)
    items.splice(index, 1, nextItem)

    await this.#db.write()
    return nextItem
  }

  async update(name: string, body: Item = {}): Promise<Item | undefined> {
    return this.#updateOrPatch(name, body, false)
  }

  async patch(name: string, body: Item = {}): Promise<Item | undefined> {
    return this.#updateOrPatch(name, body, true)
  }

  async updateById(name: string, id: string, body: Item = {}): Promise<Item | undefined> {
    return this.#updateOrPatchById(name, id, body, false)
  }

  async patchById(name: string, id: string, body: Item = {}): Promise<Item | undefined> {
    return this.#updateOrPatchById(name, id, body, true)
  }

  async destroyById(
    name: string,
    id: string,
    dependent?: string | string[],
  ): Promise<Item | undefined> {
    const items = this.#get(name)
    if (items === undefined || !Array.isArray(items)) return

    const item = items.find((item) => item['id'] === id)
    if (item === undefined) return
    const index = items.indexOf(item)
    items.splice(index, 1)

    const deleted: DeletedIds = new Map([[name, new Set([id])]])
    deleteDependents(this.#db, name, deleted, ensureArray(dependent))
    nullifyForeignKeys(this.#db, deleted)

    await this.#db.write()
    return item
  }
}
