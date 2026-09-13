import type { Adapter } from 'lowdb'

import { randomId } from '../random-id.ts'
import type { Data, IdOption, Item } from '../service.ts'

export const DEFAULT_SCHEMA_PATH = './node_modules/json-server/schema.json'
export type RawData = Record<string, Item[] | Item | string | undefined> & {
  $schema?: string
}

export class NormalizedAdapter implements Adapter<Data> {
  #adapter: Adapter<RawData>
  #id: string
  #ids: Record<string, string>

  constructor(adapter: Adapter<RawData>, id: IdOption = 'id') {
    this.#adapter = adapter
    if (typeof id === 'string') {
      this.#id = id
      this.#ids = {}
    } else {
      this.#id = 'id'
      this.#ids = id
    }
  }

  #idFor(name: string): string {
    return this.#ids[name] ?? this.#id
  }

  async read(): Promise<Data | null> {
    const data = await this.#adapter.read()

    if (data === null) {
      return null
    }

    delete data['$schema']

    for (const [name, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        const idField = this.#idFor(name)
        for (const item of value) {
          if (typeof item[idField] === 'number') {
            item[idField] = item[idField].toString()
          }

          if (item[idField] === undefined) {
            item[idField] = randomId()
          }
        }
      }
    }

    return data as Data
  }

  async write(data: Data): Promise<void> {
    await this.#adapter.write({ ...data, $schema: DEFAULT_SCHEMA_PATH })
  }
}
