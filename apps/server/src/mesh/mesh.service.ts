/**
 * KALEN Server — Mesh Bridge Service
 * Handles server-side store-and-forward outbox synchronization,
 * peer beacon tracking, and mesh message bridge to OpenIM/internal message store.
 */

import { Injectable } from '@nestjs/common';
import { StoreAndForwardQueue, MeshPacket, MeshPeerInfo } from '@kalen/shared';
import { MessageRepository } from '../database/repositories/message.repository';

@Injectable()
export class MeshService {
  private serverOutbox: StoreAndForwardQueue;
  private knownMeshNodes: Map<string, MeshPeerInfo> = new Map();

  constructor(private messageRepo: MessageRepository) {
    this.serverOutbox = new StoreAndForwardQueue(2000, 86400000);
  }

  /** Sync offline mesh packet bundle received from a client or peer node */
  async syncMeshBundle(packets: MeshPacket[]) {
    const processed: string[] = [];
    const errors: string[] = [];

    for (const packet of packets) {
      try {
        if (this.serverOutbox.hasSeen(packet)) {
          processed.push(packet.header.packetId);
          continue;
        }

        this.serverOutbox.enqueue(packet);

        // If chat message payload, persist to server database
        if (packet.payload.type === 'chat_message') {
          const data = packet.payload.data;
          await this.messageRepo.create({
            id: packet.header.packetId,
            roomId: data.roomId,
            senderId: packet.header.senderId,
            senderType: packet.header.senderType,
            content: data.content,
            metadata: {
              viaMesh: true,
              originTimestamp: packet.header.originTimestamp,
              hopCount: packet.header.hopCount,
              hops: packet.header.hops,
            },
            replyToId: data.replyToId,
            senderSuffix: packet.header.senderSuffix,
          });
        }

        // Track peer beacon if included
        if (packet.payload.type === 'peer_beacon') {
          const beacon = packet.payload.data;
          this.knownMeshNodes.set(beacon.nodeId, {
            nodeId: beacon.nodeId,
            displayName: beacon.displayName,
            entityType: beacon.entityType,
            transports: beacon.supportedTransports,
            lastSeen: new Date().toISOString(),
            hopDistance: packet.header.hopCount,
          });
        }

        processed.push(packet.header.packetId);
      } catch (err) {
        errors.push(packet.header.packetId);
      }
    }

    return {
      syncedCount: processed.length,
      processedIds: processed,
      errorIds: errors,
      pendingOutboxCount: this.serverOutbox.getPending().length,
    };
  }

  /** Get server mesh bridge status */
  getStatus() {
    return {
      serverGatewayNodeId: 'kalen-server-gateway-01',
      activeMeshNodesCount: this.knownMeshNodes.size,
      meshNodes: Array.from(this.knownMeshNodes.values()),
      pendingOutboxCount: this.serverOutbox.getPending().length,
    };
  }

  /** Fetch pending store-and-forward outbox items for a reconnecting node */
  getPendingOutboxForNode(nodeId: string) {
    const pending = this.serverOutbox.getPending();
    return pending.filter(
      (item) => item.packet.header.recipientId === nodeId || item.packet.header.recipientId === '*'
    );
  }
}
