import { isItem, type Data } from './service.ts'

export function primitiveArrayResourceNames(data: Data): string[] {
  return Object.entries(data).flatMap(([name, value]) => {
    if (Array.isArray(value) && value.some((item: unknown) => !isItem(item))) {
      return [name]
    }

    return []
  })
}

export function formatPrimitiveArrayWarning(name: string): string {
  return `Warning: "${name}" contains primitive values. Resources should usually be arrays of objects with id fields.`
}
