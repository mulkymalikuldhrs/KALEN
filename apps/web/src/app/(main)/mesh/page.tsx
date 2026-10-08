'use client';

/**
 * KALEN Web — Mesh Control Panel Page
 */

import React, { useState } from 'react';
import { MeshStatusCard } from '../../../components/mesh/mesh-status';
import { MeshPeerList } from '../../../components/mesh/mesh-peer-list';
import { useMesh } from '../../../hooks/use-mesh';
import { Send, Radio, ShieldCheck } from 'lucide-react';

export default function MeshPage() {
  const { sendMeshMessage } = useMesh();
  const [messageText, setMessageText] = useState('');
  const [sentPackets, setSentPackets] = useState<Array<{ id: string; content: string; time: string }>>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const packet = await sendMeshMessage('offline_mesh_room', messageText, '*');
    if (packet) {
      setSentPackets((prev) => [
        { id: packet.header.packetId, content: messageText, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    }
    setMessageText('');
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-7 w-7 text-indigo-500 animate-pulse" />
            KALEN Offline Mesh Network
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zero-WiFi, Zero-Cellular decentralized multi-hop store-and-forward messaging for Humans and Autonomous Agents.
          </p>
        </div>
      </div>

      <MeshStatusCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MeshPeerList />

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-400" />
              Broadcast Mesh Test Message
            </h3>

            <form onSubmit={handleSend} className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Type offline message to flood across mesh peers..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Send className="h-4 w-4" />
                Flood Mesh
              </button>
            </form>

            {sentPackets.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dispatched Offline Packets
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sentPackets.map((pkt) => (
                    <div key={pkt.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs font-mono flex justify-between items-center">
                      <div>
                        <span className="text-indigo-400 font-bold">{pkt.id}</span>: {pkt.content}
                      </div>
                      <span className="text-muted-foreground">{pkt.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Mesh Protocol Specifications
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
              <li>WebRTC Local P2P DataChannels</li>
              <li>Web Bluetooth BLE Short-Range Radio</li>
              <li>Gossip & Multi-Hop Flooding Routing</li>
              <li>IndexedDB Store-and-Forward Outbox</li>
              <li>Dual Identity (Human + Agent) Routing</li>
              <li>Ed25519 Cryptographic Packet Signing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
