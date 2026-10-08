/**
 * @kalen/web — useMesh Hook
 * React hook for inspecting and controlling offline mesh state.
 */

import { useState, useEffect } from 'react';
import { meshClientManager } from '../lib/mesh-client';
import type { MeshNetworkStatus, MeshPeerInfo } from '@kalen/shared';

export function useMesh(userId?: string, userName?: string) {
  const [meshActive, setMeshActive] = useState<boolean>(true);
  const [status, setStatus] = useState<MeshNetworkStatus | null>(null);
  const [peers, setPeers] = useState<MeshPeerInfo[]>([]);

  useEffect(() => {
    const id = userId ?? 'offline_user_01';
    const name = userName ?? 'Offline Human';
    const engine = meshClientManager.initialize(id, name, 'human', `@${name.toLowerCase().replace(/\s+/g, '')}`);

    const updateState = () => {
      setStatus(meshClientManager.getStatus());
      setPeers(meshClientManager.getPeers());
    };

    updateState();

    const unsubMesh = engine.subscribe(() => {
      updateState();
    });

    const interval = setInterval(updateState, 2000);

    return () => {
      unsubMesh();
      clearInterval(interval);
    };
  }, [userId, userName]);

  const toggleMesh = async () => {
    const engine = meshClientManager.getEngine();
    if (!engine) return;

    if (engine.isMeshActive()) {
      await engine.stop();
      setMeshActive(false);
    } else {
      await engine.start();
      setMeshActive(true);
    }
    setStatus(engine.getStatus());
  };

  const sendMeshMessage = async (roomId: string, content: string, recipientId = '*') => {
    const engine = meshClientManager.getEngine();
    if (!engine) return null;
    return engine.sendChatMessage(roomId, content, recipientId);
  };

  return {
    meshActive,
    status,
    peers,
    toggleMesh,
    sendMeshMessage,
    engine: meshClientManager.getEngine(),
  };
}
