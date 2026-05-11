export class SimpleQueue<T> {
  private items: T[]

  constructor(items: T[]) {
    this.items = items.slice()
  }

  pop(): T | undefined {
    return this.items.shift()
  }

  size(): number {
    return this.items.length
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  toArray(): T[] {
    return this.items.slice()
  }
}
