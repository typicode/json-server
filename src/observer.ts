import type { Adapter } from 'lowdb'

// Lowdb adapter to observe read/write events
export class Observer<T> {
  #adapter: Adapter<T>

  onReadStart = function () {
    return
  }
  onReadEnd: (data: T | null) => void = function () {
    return
  }
  onWriteStart = function () {
    return
  }
  onWriteEnd = function () {
    return
  }

  constructor(adapter: Adapter<T>) {
    this.#adapter = adapter
  }

  async read() {
    this.onReadStart()
    try {
      const data = await this.#adapter.read()
      this.onReadEnd(data)
      return data
    } catch (e) {
      this.onReadEnd(null)
      throw e
    }
  }

  async write(arg: T) {
    this.onWriteStart()
    try {
      await this.#adapter.write(arg)
    } finally {
      this.onWriteEnd()
    }
  }
}
