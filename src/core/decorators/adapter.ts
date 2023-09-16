import path from 'path'
import { callsites } from '../utils/callsites.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Adapter<T extends { new (...args: any[]): object }>(
  baseClass: T,
  _context: ClassDecoratorContext,
) {
  const filePath = callsites()[1]!.getFileName()!

  const product = path.basename(path.dirname(filePath))

  return class extends baseClass {
    product = product
  }
}
