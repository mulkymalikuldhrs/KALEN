/**
 * @kalen/shared — Offline Agent Mesh Handler
 * Allows autonomous agents running client-side or on edge nodes
 * to process incoming offline mesh messages, execute tools, and reply over mesh.
 */

import type { MeshPacket, MeshChatMessagePayload } from '../types/mesh';
import type { MeshNetworkEngine } from './mesh-engine';

export interface OfflineAgentConfig {
  agentId: string;
  agentName: string;
  agentSuffix: string;
  capabilities: string[];
  systemPrompt?: string;
}

export class MeshAgentHandler {
  private config: OfflineAgentConfig;
  private meshEngine: MeshNetworkEngine;
  private unsubscriber?: () => void;

  constructor(config: OfflineAgentConfig, meshEngine: MeshNetworkEngine) {
    this.config = config;
    this.meshEngine = meshEngine;
  }

  public start(): void {
    this.unsubscriber = this.meshEngine.subscribe((packet) => this.handlePacket(packet));
  }

  public stop(): void {
    if (this.unsubscriber) {
      this.unsubscriber();
    }
  }

  private async handlePacket(packet: MeshPacket): Promise<void> {
    // Only handle chat messages or task requests targeting this agent
    if (packet.header.senderId === this.config.agentId) return; // ignore self
    if (packet.payload.type !== 'chat_message') return;

    const data = packet.payload.data as MeshChatMessagePayload;

    // Check if mentioned or direct message
    const isDM = packet.header.recipientId === this.config.agentId;
    const isMentioned = data.content.includes(this.config.agentSuffix) || data.content.includes(this.config.agentName);

    if (isDM || isMentioned) {
      // Process offline agent response
      const replyContent = this.generateOfflineResponse(data.content);
      await this.meshEngine.sendChatMessage(
        data.roomId,
        replyContent,
        packet.header.senderId,
        packet.header.packetId
      );
    }
  }

  private generateOfflineResponse(userQuery: string): string {
    const queryLower = userQuery.toLowerCase();

    if (queryLower.includes('ping') || queryLower.includes('status') || queryLower.includes('hello')) {
      return `[Offline Agent ${this.config.agentName}] Operational over KALEN Mesh Network. Hop count active.`;
    }

    if (queryLower.includes('mesh') || queryLower.includes('network')) {
      const status = this.meshEngine.getStatus();
      return `[Offline Agent ${this.config.agentName}] Mesh Status: ${status.connectedPeersCount} peers connected, ${status.queuedOutboxCount} queued in store-and-forward outbox.`;
    }

    return `[Offline Agent ${this.config.agentName}] Received message via mesh. Processing request offline.`;
  }
}
