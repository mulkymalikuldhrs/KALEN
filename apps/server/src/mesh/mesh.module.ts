/**
 * KALEN Server — Mesh Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeshService } from './mesh.service';
import { MeshController } from './mesh.controller';
import { MessageRepository } from '../database/repositories/message.repository';
import { MessageEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [MeshController],
  providers: [MeshService, MessageRepository],
  exports: [MeshService],
})
export class MeshModule {}
