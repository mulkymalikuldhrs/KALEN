/**
 * @kalen/shared — Offline Mesh Protocol Types
 * Defines data structures for mesh packets, routing headers, transports,
 * store-and-forward outbox items, and peer discovery beacons.
 */

export type MeshTransportType = 'webrtc' | 'bluetooth' | 'local_lan' | 'store_and_forward';

export interface MeshHopHistory {
  nodeId: string;
  nodeType: 'human' | 'agent' | 'gateway';
  timestamp: string;
  transport: MeshTransportType;
}

export interface MeshRoutingHeader {
  packetId: string;
  senderId: string;
  senderType: 'human' | 'agent';
  senderSuffix: string;
  recipientId: string | '*'; // '*' for broadcast/gossip
  ttl: number;
  hopCount: number;
  maxHops: number;
  originTimestamp: string;
  hops: MeshHopHistory[];
}

export type MeshPayloadType = 'chat_message' | 'peer_beacon' | 'gossip_digest' | 'a2a_task' | 'ack';

export interface MeshChatMessagePayload {
  roomId: string;
  content: string;
  contentType: 'text' | 'markdown' | 'json';
  metadata?: Record<string, unknown>;
  replyToId?: string;
}

export interface MeshPeerBeaconPayload {
  nodeId: string;
  displayName: string;
  entityType: 'human' | 'agent' | 'gateway';
  supportedTransports: MeshTransportType[];
  knownPeersCount: number;
  capabilities?: string[];
}

export interface MeshGossipDigestPayload {
  seenPacketHashes: string[];
  pendingOutboxCount: number;
}

export interface MeshA2ATaskPayload {
  taskId: string;
  method: string;
  params: Record<string, unknown>;
}

export interface MeshAckPayload {
  ackPacketId: string;
  receivedAt: string;
}

export type MeshPayloadData =
  | { type: 'chat_message'; data: MeshChatMessagePayload }
  | { type: 'peer_beacon'; data: MeshPeerBeaconPayload }
  | { type: 'gossip_digest'; data: MeshGossipDigestPayload }
  | { type: 'a2a_task'; data: MeshA2ATaskPayload }
  | { type: 'ack'; data: MeshAckPayload };

export interface MeshPacket {
  header: MeshRoutingHeader;
  payload: MeshPayloadData;
  signature?: string; // Ed25519 signature from origin sender
}

export interface MeshPeerInfo {
  nodeId: string;
  displayName: string;
  entityType: 'human' | 'agent' | 'gateway';
  transports: MeshTransportType[];
  lastSeen: string;
  hopDistance: number;
  routeNextHop?: string;
}

export interface StoreAndForwardMessage {
  id: string;
  packet: MeshPacket;
  status: 'queued' | 'relaying' | 'delivered' | 'expired';
  retryCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface MeshNetworkStatus {
  nodeId: string;
  entityType: 'human' | 'agent';
  meshActive: boolean;
  activeTransports: MeshTransportType[];
  connectedPeersCount: number;
  queuedOutboxCount: number;
  deliveredCount: number;
  relayedCount: number;
}
