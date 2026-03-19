import { randomBytes } from 'node:crypto'

export function randomId(): string {
  return randomBytes(8).toString('hex')
}
