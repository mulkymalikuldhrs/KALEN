/**
 * KALEN Server — Mesh Controller
 * Endpoints for syncing offline mesh bundles and querying mesh gateway status.
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MeshService } from './mesh.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { MeshPacket } from '@kalen/shared';

@ApiTags('Mesh')
@Controller('mesh')
export class MeshController {
  constructor(private readonly meshService: MeshService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get mesh gateway status and active peers' })
  getStatus() {
    return this.meshService.getStatus();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync offline store-and-forward mesh packet bundle' })
  syncBundle(@Body() body: { packets: MeshPacket[] }) {
    return this.meshService.syncMeshBundle(body.packets ?? []);
  }

  @Get('outbox/:nodeId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get pending mesh outbox items for a node' })
  getOutbox(@Param('nodeId') nodeId: string) {
    return this.meshService.getPendingOutboxForNode(nodeId);
  }
}
