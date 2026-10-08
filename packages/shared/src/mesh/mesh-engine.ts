/**
 * @kalen/shared — Mesh Network Engine
 * Central multi-hop gossip router, peer discovery coordinator, and transport manager.
 */

import type {
  MeshPacket,
  MeshPeerInfo,
  MeshNetworkStatus,
  MeshChatMessagePayload,
  MeshPeerBeaconPayload,
  MeshTransportType,
} from '../types/mesh';
import { StoreAndForwardQueue } from './store-and-forward';
import { WebRTCDataChannelTransport } from './transports/webrtc-transport';
import { WebBluetoothTransport } from './transports/bluetooth-transport';

export class MeshNetworkEngine {
  public readonly nodeId: string;
  public readonly displayName: string;
  public readonly entityType: 'human' | 'agent';
  public readonly suffix: string;

  private active = false;
  private knownPeers: Map<string, MeshPeerInfo> = new Map();
  private storeAndForward: StoreAndForwardQueue;
  private webrtcTransport: WebRTCDataChannelTransport;
  private bluetoothTransport: WebBluetoothTransport;

  private packetSubscribers: Set<(packet: MeshPacket) => void> = new Set();
  private deliveredCount = 0;
  private relayedCount = 0;

  constructor(nodeId: string, displayName: string, entityType: 'human' | 'agent', suffix: string) {
    this.nodeId = nodeId;
    this.displayName = displayName;
    this.entityType = entityType;
    this.suffix = suffix;

    this.storeAndForward = new StoreAndForwardQueue();
    this.webrtcTransport = new WebRTCDataChannelTransport();
    this.bluetoothTransport = new WebBluetoothTransport();

    // Bind incoming packets from transports
    this.webrtcTransport.onPacket((p) => this.processIncomingPacket(p, 'webrtc'));
    this.bluetoothTransport.onPacket((p) => this.processIncomingPacket(p, 'bluetooth'));
  }

  public async start(): Promise<void> {
    this.active = true;
    await this.webrtcTransport.start();
    await this.bluetoothTransport.start();
    this.broadcastBeacon();
  }

  public async stop(): Promise<void> {
    this.active = false;
    await this.webrtcTransport.stop();
    await this.bluetoothTransport.stop();
  }

  public isMeshActive(): boolean {
    return this.active;
  }

  public subscribe(callback: (packet: MeshPacket) => void): () => void {
    this.packetSubscribers.add(callback);
    return () => this.packetSubscribers.delete(callback);
  }

  /** Create and broadcast a chat message across mesh */
  public async sendChatMessage(
    roomId: string,
    content: string,
    recipientId = '*',
    replyToId?: string,
  ): Promise<MeshPacket> {
    const packetId = `mesh_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const payload: MeshChatMessagePayload = {
      roomId,
      content,
      contentType: 'text',
      replyToId,
    };

    const packet: MeshPacket = {
      header: {
        packetId,
        senderId: this.nodeId,
        senderType: this.entityType,
        senderSuffix: this.suffix,
        recipientId,
        ttl: 10,
        hopCount: 0,
        maxHops: 10,
        originTimestamp: now,
        hops: [
          {
            nodeId: this.nodeId,
            nodeType: this.entityType,
            timestamp: now,
            transport: 'local_lan',
          },
        ],
      },
      payload: {
        type: 'chat_message',
        data: payload,
      },
    };

    this.storeAndForward.enqueue(packet);
    await this.floodRelay(packet);

    return packet;
  }

  /** Process incoming mesh packet with multi-hop routing & deduplication */
  public async processIncomingPacket(packet: MeshPacket, incomingTransport: MeshTransportType): Promise<void> {
    if (!this.active) return;

    // Deduplication check
    if (this.storeAndForward.hasSeen(packet)) {
      return;
    }
    this.storeAndForward.markSeen(packet);

    // Record hop
    const now = new Date().toISOString();
    packet.header.hopCount += 1;
    packet.header.hops.push({
      nodeId: this.nodeId,
      nodeType: this.entityType,
      timestamp: now,
      transport: incomingTransport,
    });

    // Check TTL / max hops
    if (packet.header.hopCount > packet.header.maxHops || packet.header.ttl <= 0) {
      return;
    }
    packet.header.ttl -= 1;

    // Handle peer beacon
    if (packet.payload.type === 'peer_beacon') {
      const beacon = packet.payload.data as MeshPeerBeaconPayload;
      if (beacon.nodeId !== this.nodeId) {
        this.knownPeers.set(beacon.nodeId, {
          nodeId: beacon.nodeId,
          displayName: beacon.displayName,
          entityType: beacon.entityType,
          transports: beacon.supportedTransports,
          lastSeen: now,
          hopDistance: packet.header.hopCount,
          routeNextHop: packet.header.senderId,
        });
      }
    }

    // Check if intended for this node or broadcast
    const isForMe = packet.header.recipientId === this.nodeId || packet.header.recipientId === '*';

    if (isForMe) {
      this.deliveredCount++;
      for (const subscriber of this.packetSubscribers) {
        subscriber(packet);
      }
    }

    // Relay if broadcast or intended for another node
    if (packet.header.recipientId !== this.nodeId) {
      this.relayedCount++;
      this.storeAndForward.enqueue(packet);
      await this.floodRelay(packet);
    }
  }

  /** Flood relay to all connected transports */
  private async floodRelay(packet: MeshPacket): Promise<void> {
    await this.webrtcTransport.send(packet);
    await this.bluetoothTransport.send(packet);
  }

  /** Broadcast periodic beacon to announce presence over offline mesh */
  public broadcastBeacon(): void {
    if (!this.active) return;

    const beacon: MeshPeerBeaconPayload = {
      nodeId: this.nodeId,
      displayName: this.displayName,
      entityType: this.entityType,
      supportedTransports: ['webrtc', 'bluetooth'],
      knownPeersCount: this.knownPeers.size,
    };

    const packet: MeshPacket = {
      header: {
        packetId: `beacon_${this.nodeId}_${Date.now()}`,
        senderId: this.nodeId,
        senderType: this.entityType,
        senderSuffix: this.suffix,
        recipientId: '*',
        ttl: 3,
        hopCount: 0,
        maxHops: 3,
        originTimestamp: new Date().toISOString(),
        hops: [],
      },
      payload: {
        type: 'peer_beacon',
        data: beacon,
      },
    };

    this.floodRelay(packet);
  }

  public getKnownPeers(): MeshPeerInfo[] {
    return Array.from(this.knownPeers.values());
  }

  public getStatus(): MeshNetworkStatus {
    return {
      nodeId: this.nodeId,
      entityType: this.entityType,
      meshActive: this.active,
      activeTransports: ['webrtc', 'bluetooth'],
      connectedPeersCount: this.knownPeers.size,
      queuedOutboxCount: this.storeAndForward.getPending().length,
      deliveredCount: this.deliveredCount,
      relayedCount: this.relayedCount,
    };
  }

  public getWebRTCTransport(): WebRTCDataChannelTransport {
    return this.webrtcTransport;
  }

  public getBluetoothTransport(): WebBluetoothTransport {
    return this.bluetoothTransport;
  }

  public getStoreAndForwardQueue(): StoreAndForwardQueue {
    return this.storeAndForward;
  }
}
