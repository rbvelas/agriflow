// fincas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FincasService } from './fincas.service';
import { FincasController } from './fincas.controller';
import { Finca } from './entities/finca.entity';
import { Lote } from '../lotes/entities/lote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Finca, Lote])],
  controllers: [FincasController],
  providers: [FincasService],
  exports: [FincasService],
})
export class FincasModule {}
