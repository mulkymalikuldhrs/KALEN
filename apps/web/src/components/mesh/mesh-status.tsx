'use client';

/**
 * KALEN Web — Mesh Status Card Component
 */

import React from 'react';
import { useMesh } from '../../hooks/use-mesh';
import { Radio, WifiOff, Share2, Inbox, CheckCircle2 } from 'lucide-react';

export function MeshStatusCard() {
  const { meshActive, status, peers, toggleMesh } = useMesh();

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${meshActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Offline Mesh Network
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meshActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {meshActive ? 'ACTIVE (P2P)' : 'DISABLED'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Cellular & WiFi independent peer-to-peer mesh messaging
            </p>
          </div>
        </div>

        <button
          onClick={toggleMesh}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            meshActive
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {meshActive ? 'Deactivate Mesh' : 'Activate Mesh'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Share2 className="h-4 w-4 text-indigo-400" />
            Connected Peers
          </div>
          <p className="text-xl font-bold">{peers.length + 1}</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Inbox className="h-4 w-4 text-amber-400" />
            Outbox Queue
          </div>
          <p className="text-xl font-bold">{status?.queuedOutboxCount ?? 0}</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Delivered
          </div>
          <p className="text-xl font-bold">{status?.deliveredCount ?? 0}</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <WifiOff className="h-4 w-4 text-sky-400" />
            Transports
          </div>
          <p className="text-xs font-semibold text-emerald-400 mt-1">WebRTC + BLE</p>
        </div>
      </div>
    </div>
  );
}
