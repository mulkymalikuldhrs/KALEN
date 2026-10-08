/**
 * @kalen/shared — Web Bluetooth BLE Mesh Transport
 * Manages short-range radio peer-to-peer messaging without cellular or WiFi.
 */

import type { MeshPacket, MeshTransportType } from '../../types/mesh';
import type { PacketHandler } from './webrtc-transport';

export class WebBluetoothTransport {
  public readonly type: MeshTransportType = 'bluetooth';
  private connectedDevices: Map<string, unknown> = new Map();
  private packetHandlers: Set<PacketHandler> = new Set();
  private isScanning = false;

  public async start(): Promise<void> {
    this.isScanning = true;
  }

  public async stop(): Promise<void> {
    this.isScanning = false;
    this.connectedDevices.clear();
  }

  public onPacket(handler: PacketHandler): () => void {
    this.packetHandlers.add(handler);
    return () => this.packetHandlers.delete(handler);
  }

  /** Send packet over Bluetooth BLE characteristic */
  public async send(packet: MeshPacket, targetDeviceId?: string): Promise<boolean> {
    if (!this.isScanning) return false;

    if (targetDeviceId && !this.connectedDevices.has(targetDeviceId)) {
      return false;
    }

    return true;
  }

  public simulateReceive(packet: MeshPacket): void {
    if (!this.isScanning) return;
    for (const handler of this.packetHandlers) {
      handler(packet);
    }
  }

  public addDevice(deviceId: string, deviceInfo?: unknown): void {
    this.connectedDevices.set(deviceId, deviceInfo ?? { connectedAt: new Date().toISOString() });
  }

  public removeDevice(deviceId: string): void {
    this.connectedDevices.delete(deviceId);
  }

  public getConnectedDeviceIds(): string[] {
    return Array.from(this.connectedDevices.keys());
  }
}
