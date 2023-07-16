type Node<T> = {
  key: string;
  value: T;
  next: Node<T>;
  prev: Node<T>;
}

export class LRUCache<T> {
  map:      Map<string, Node<T>>;
  capacity: number;

  head: Node<T>;
  tail: Node<T>;

  constructor(capacity: number) {
    this.map = new Map();
    this.capacity = capacity;

    this.head = {} as Node<T>;
    this.tail = {} as Node<T>;

    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get<U extends T>(key: string) {
    const node = this.map.get(key);
    if (node === undefined) {
      return undefined;
    }

    node.prev.next = node.next;
    node.next.prev = node.prev;

    this.tail.prev.next = node;
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev = node;

    return node.value as U;
  }

  put(key: string, value: T) {
    const node = this.get(key);
    if (node !== undefined) {
      this.tail.prev.value = value;
      return;
    }

    if (this.map.size === this.capacity) {
      this.map.delete(this.head.next.key);
      this.head.next = this.head.next.next;
      this.head.next.prev = this.head;
    }

    const newNode = { key, value } as Node<T>;

    this.map.set(key, newNode);
    this.tail.prev.next = newNode;
    newNode.prev = this.tail.prev;
    newNode.next = this.tail;
    this.tail.prev = newNode;
  }

  get size() {
    return this.map.size;
  }
}
