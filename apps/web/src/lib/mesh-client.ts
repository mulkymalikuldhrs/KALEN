/**
 * @kalen/web — Mesh Client Manager
 * Singleton MeshNetworkEngine for browser offline mesh operations.
 */

import { MeshNetworkEngine, MeshAgentHandler, type MeshNetworkStatus, type MeshPeerInfo } from '@kalen/shared';

class MeshClientManager {
  private engine: MeshNetworkEngine | null = null;
  private agentHandler: MeshAgentHandler | null = null;
  private listeners: Set<() => void> = new Set();

  public initialize(userId: string, userName: string, entityType: 'human' | 'agent' = 'human', suffix = '@local.user'): MeshNetworkEngine {
    if (this.engine) return this.engine;

    this.engine = new MeshNetworkEngine(userId, userName, entityType, suffix);
    this.engine.start();

    // Register a mock local offline agent to reply over mesh if offline
    if (entityType === 'human') {
      const offlineAgentEngine = new MeshNetworkEngine('local_agent_assistant', 'Offline Assistant (ai)', 'agent', '@assistant.agent#local');
      offlineAgentEngine.start();
      this.agentHandler = new MeshAgentHandler(
        {
          agentId: 'local_agent_assistant',
          agentName: 'Offline Assistant (ai)',
          agentSuffix: '@assistant.agent#local',
          capabilities: ['offline_chat', 'store_and_forward'],
        },
        offlineAgentEngine
      );
      this.agentHandler.start();

      // Connect local agent transport to human transport
      this.engine.getWebRTCTransport().addPeer('local_agent_assistant');
      offlineAgentEngine.getWebRTCTransport().addPeer(userId);

      // Wire cross receive for simulation
      this.engine.subscribe((packet) => {
        if (packet.header.senderId === userId && packet.header.recipientId === 'local_agent_assistant') {
          offlineAgentEngine.processIncomingPacket(packet, 'webrtc');
        }
      });
      offlineAgentEngine.subscribe((packet) => {
        if (packet.header.recipientId === userId) {
          this.engine?.processIncomingPacket(packet, 'webrtc');
        }
      });
    }

    return this.engine;
  }

  public getEngine(): MeshNetworkEngine | null {
    return this.engine;
  }

  public getStatus(): MeshNetworkStatus | null {
    return this.engine ? this.engine.getStatus() : null;
  }

  public getPeers(): MeshPeerInfo[] {
    return this.engine ? this.engine.getKnownPeers() : [];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const meshClientManager = new MeshClientManager();
