/**
 * @kalen/shared — Store and Forward Queue
 * In-memory / persistent outbox queue for offline mesh messages.
 * Prevents message loss when offline and handles deduplication + TTL.
 */

import type { MeshPacket, StoreAndForwardMessage } from '../types/mesh';

export class StoreAndForwardQueue {
  private queue: Map<string, StoreAndForwardMessage> = new Map();
  private seenHashes: Set<string> = new Set();
  private maxItems: number;
  private defaultTTLMs: number;

  constructor(maxItems = 1000, defaultTTLMs = 86400000) { // 24h default TTL
    this.maxItems = maxItems;
    this.defaultTTLMs = defaultTTLMs;
  }

  /** Calculate packet hash for deduplication */
  public getPacketHash(packet: MeshPacket): string {
    const key = `${packet.header.packetId}:${packet.header.senderId}:${packet.header.originTimestamp}`;
    return key;
  }

  /** Check if a packet was already seen/processed */
  public hasSeen(packet: MeshPacket): boolean {
    const hash = this.getPacketHash(packet);
    return this.seenHashes.has(hash);
  }

  /** Mark packet as seen */
  public markSeen(packet: MeshPacket): void {
    const hash = this.getPacketHash(packet);
    this.seenHashes.add(hash);
    if (this.seenHashes.size > 5000) {
      // Trim oldest
      const first = this.seenHashes.values().next().value;
      if (first) this.seenHashes.delete(first);
    }
  }

  /** Enqueue a packet for store-and-forward relaying */
  public enqueue(packet: MeshPacket, customTTLMs?: number): StoreAndForwardMessage | null {
    if (this.hasSeen(packet)) {
      return null;
    }

    this.markSeen(packet);

    if (this.queue.size >= this.maxItems) {
      this.evictOldest();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (customTTLMs ?? this.defaultTTLMs)).toISOString();

    const item: StoreAndForwardMessage = {
      id: packet.header.packetId,
      packet,
      status: 'queued',
      retryCount: 0,
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.queue.set(item.id, item);
    return item;
  }

  /** Get all active pending items */
  public getPending(): StoreAndForwardMessage[] {
    this.purgeExpired();
    return Array.from(this.queue.values()).filter(
      (item) => item.status === 'queued' || item.status === 'relaying'
    );
  }

  /** Mark item as delivered */
  public markDelivered(packetId: string): boolean {
    const item = this.queue.get(packetId);
    if (item) {
      item.status = 'delivered';
      return true;
    }
    return false;
  }

  /** Increment retry count for item */
  public incrementRetry(packetId: string): void {
    const item = this.queue.get(packetId);
    if (item) {
      item.retryCount += 1;
      if (item.retryCount > 10) {
        item.status = 'expired';
      }
    }
  }

  /** Purge expired items */
  public purgeExpired(): number {
    const now = new Date().toISOString();
    let purged = 0;
    for (const [id, item] of this.queue.entries()) {
      if (item.expiresAt < now || item.status === 'delivered' || item.status === 'expired') {
        this.queue.delete(id);
        purged++;
      }
    }
    return purged;
  }

  /** Evict oldest item when queue is full */
  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, item] of this.queue.entries()) {
      const time = new Date(item.createdAt).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.queue.delete(oldestId);
    }
  }

  public size(): number {
    return this.queue.size;
  }

  public clear(): void {
    this.queue.clear();
    this.seenHashes.clear();
  }
}
