import { PathLike } from 'fs'
import JSON5 from 'json5'
import { Adapter } from 'lowdb'
import { TextFile } from 'lowdb/node'

export class JSON5File<T> implements Adapter<T> {
  #adapter: TextFile

  constructor(filename: PathLike) {
    this.#adapter = new TextFile(filename)
  }

  async read(): Promise<T | null> {
    const data = await this.#adapter.read()
    if (data === null) {
      return null
    } else {
      return JSON5.parse(data)
    }
  }

  write(obj: T): Promise<void> {
    return this.#adapter.write(JSON5.stringify(obj, null, 2))
  }
}
