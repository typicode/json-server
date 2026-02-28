import { randomBytes } from 'node:crypto'

export function randomId(): string {
  return randomBytes(2).toString('hex')
}
