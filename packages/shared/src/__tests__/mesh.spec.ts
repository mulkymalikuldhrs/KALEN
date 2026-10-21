/**
 * @kalen/shared — Mesh Engine Unit Tests
 */

import { MeshNetworkEngine } from '../mesh/mesh-engine';
import { StoreAndForwardQueue } from '../mesh/store-and-forward';
import { MeshAgentHandler } from '../mesh/mesh-agent-handler';
import type { MeshPacket } from '../types/mesh';

describe('StoreAndForwardQueue', () => {
  let queue: StoreAndForwardQueue;

  beforeEach(() => {
    queue = new StoreAndForwardQueue(10, 60000);
  });

  it('enqueues and deduplicates packets', () => {
    const packet: MeshPacket = {
      header: {
        packetId: 'p1',
        senderId: 'user1',
        senderType: 'human',
        senderSuffix: '@user1',
        recipientId: '*',
        ttl: 10,
        hopCount: 0,
        maxHops: 10,
        originTimestamp: new Date().toISOString(),
        hops: [],
      },
      payload: {
        type: 'chat_message',
        data: { roomId: 'room1', content: 'hello offline', contentType: 'text' },
      },
    };

    const item1 = queue.enqueue(packet);
    expect(item1).not.toBeNull();
    expect(queue.size()).toBe(1);

    // Duplicate enqueue returns null
    const item2 = queue.enqueue(packet);
    expect(item2).toBeNull();
    expect(queue.size()).toBe(1);
  });

  it('marks delivered and purges expired', () => {
    const packet: MeshPacket = {
      header: {
        packetId: 'p2',
        senderId: 'user1',
        senderType: 'human',
        senderSuffix: '@user1',
        recipientId: '*',
        ttl: 10,
        hopCount: 0,
        maxHops: 10,
        originTimestamp: new Date().toISOString(),
        hops: [],
      },
      payload: {
        type: 'chat_message',
        data: { roomId: 'room1', content: 'test', contentType: 'text' },
      },
    };

    queue.enqueue(packet);
    expect(queue.getPending().length).toBe(1);

    queue.markDelivered('p2');
    const purged = queue.purgeExpired();
    expect(purged).toBe(1);
    expect(queue.getPending().length).toBe(0);
  });
});

describe('MeshNetworkEngine & Transports', () => {
  let engineA: MeshNetworkEngine;
  let engineB: MeshNetworkEngine;

  beforeEach(async () => {
    engineA = new MeshNetworkEngine('nodeA', 'Alice', 'human', '@alice');
    engineB = new MeshNetworkEngine('nodeB', 'BobAgent (ai)', 'agent', '@bob.agent#1234');

    await engineA.start();
    await engineB.start();
  });

  afterEach(async () => {
    await engineA.stop();
    await engineB.stop();
  });

  it('initializes with correct node status', () => {
    const statusA = engineA.getStatus();
    expect(statusA.nodeId).toBe('nodeA');
    expect(statusA.meshActive).toBe(true);
    expect(statusA.entityType).toBe('human');
  });

  it('sends chat message and delivers over transports', async () => {
    const receivedPackets: MeshPacket[] = [];
    engineB.subscribe((packet) => {
      receivedPackets.push(packet);
    });

    const packet = await engineA.sendChatMessage('room1', 'Hello over offline mesh!');

    // Simulate WebRTC transport delivery from A to B
    engineB.getWebRTCTransport().simulateReceive(packet);

    expect(receivedPackets.length).toBe(1);
    expect(receivedPackets[0].header.senderId).toBe('nodeA');
  });
});

describe('MeshAgentHandler', () => {
  let engineAgent: MeshNetworkEngine;
  let agentHandler: MeshAgentHandler;

  beforeEach(async () => {
    engineAgent = new MeshNetworkEngine('agentNode', 'Helper (ai)', 'agent', '@helper.agent#0001');
    await engineAgent.start();

    agentHandler = new MeshAgentHandler(
      {
        agentId: 'agentNode',
        agentName: 'Helper (ai)',
        agentSuffix: '@helper.agent#0001',
        capabilities: ['offline_chat'],
      },
      engineAgent
    );
    agentHandler.start();
  });

  afterEach(async () => {
    agentHandler.stop();
    await engineAgent.stop();
  });

  it('processes incoming mesh messages and replies', async () => {
    const incomingMessage: MeshPacket = {
      header: {
        packetId: 'msg1',
        senderId: 'human1',
        senderType: 'human',
        senderSuffix: '@human1',
        recipientId: 'agentNode',
        ttl: 5,
        hopCount: 0,
        maxHops: 5,
        originTimestamp: new Date().toISOString(),
        hops: [],
      },
      payload: {
        type: 'chat_message',
        data: {
          roomId: 'room1',
          content: 'ping',
          contentType: 'text',
        },
      },
    };

    await engineAgent.processIncomingPacket(incomingMessage, 'webrtc');

    const pendingOutbox = engineAgent.getStoreAndForwardQueue().getPending();
    expect(pendingOutbox.length).toBe(1);
    expect((pendingOutbox[0].packet.payload.data as any).content).toContain('Operational over KALEN Mesh Network');
  });
});
