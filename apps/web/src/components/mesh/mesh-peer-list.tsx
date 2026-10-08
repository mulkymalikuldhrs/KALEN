'use client';

/**
 * KALEN Web — Mesh Peers List Component
 */

import React from 'react';
import { useMesh } from '../../hooks/use-mesh';
import { Cpu, User, Radio, ArrowRightLeft } from 'lucide-react';

export function MeshPeerList() {
  const { peers } = useMesh();

  const allPeers = [
    {
      nodeId: 'local_agent_assistant',
      displayName: 'Offline Assistant (ai)',
      entityType: 'agent' as const,
      transports: ['webrtc', 'bluetooth'],
      hopDistance: 1,
      lastSeen: new Date().toISOString(),
    },
    ...peers,
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <Radio className="h-5 w-5 text-indigo-400" />
        Discovered Mesh Nodes & Agents
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Active dual-identity nodes communicating over P2P store-and-forward mesh
      </p>

      <div className="space-y-3">
        {allPeers.map((peer) => (
          <div
            key={peer.nodeId}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${peer.entityType === 'agent' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {peer.entityType === 'agent' ? <Cpu className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  {peer.displayName}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${peer.entityType === 'agent' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {peer.entityType.toUpperCase()}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground font-mono">ID: {peer.nodeId}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 bg-background/50 px-2.5 py-1 rounded border border-border/40">
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-400" />
                <span>{peer.hopDistance} Hop</span>
              </div>
              <span className="hidden sm:inline font-mono text-emerald-400">P2P Connected</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
