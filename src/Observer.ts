import { Adapter } from 'lowdb'

// Lowdb adapter to observe read/write events
export class Observer<T> {
  #adapter

  onReadStart = function () {
    return
  }
  onReadEnd = function () {
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
    const data = await this.#adapter.read()
    this.onReadEnd()
    return data
  }

  async write(arg: T) {
    this.onWriteStart()
    await this.#adapter.write(arg)
    this.onWriteEnd()
  }
}
