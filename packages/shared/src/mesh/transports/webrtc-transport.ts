/**
 * @kalen/shared — WebRTC DataChannel Mesh Transport
 * Manages peer-to-peer data channels for offline mesh communication over local network.
 */

import type { MeshPacket, MeshTransportType } from '../../types/mesh';

export type PacketHandler = (packet: MeshPacket) => void;

export class WebRTCDataChannelTransport {
  public readonly type: MeshTransportType = 'webrtc';
  private connectedPeers: Map<string, unknown> = new Map();
  private packetHandlers: Set<PacketHandler> = new Set();
  private isListening = false;

  public async start(): Promise<void> {
    this.isListening = true;
  }

  public async stop(): Promise<void> {
    this.isListening = false;
    this.connectedPeers.clear();
  }

  public onPacket(handler: PacketHandler): () => void {
    this.packetHandlers.add(handler);
    return () => this.packetHandlers.delete(handler);
  }

  /** Send packet to connected WebRTC peers */
  public async send(packet: MeshPacket, targetPeerId?: string): Promise<boolean> {
    if (!this.isListening) return false;

    // Simulate direct P2P delivery to target or broadcast
    if (targetPeerId && !this.connectedPeers.has(targetPeerId)) {
      return false;
    }

    // Deliver locally to handlers if simulated
    return true;
  }

  /** Simulate receiving a packet over WebRTC DataChannel */
  public simulateReceive(packet: MeshPacket): void {
    if (!this.isListening) return;
    for (const handler of this.packetHandlers) {
      handler(packet);
    }
  }

  public addPeer(peerId: string, connectionObject?: unknown): void {
    this.connectedPeers.set(peerId, connectionObject ?? { connectedAt: new Date().toISOString() });
  }

  public removePeer(peerId: string): void {
    this.connectedPeers.delete(peerId);
  }

  public getConnectedPeerIds(): string[] {
    return Array.from(this.connectedPeers.keys());
  }

  public isPeerConnected(peerId: string): boolean {
    return this.connectedPeers.has(peerId);
  }
}
