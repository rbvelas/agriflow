import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerta } from './entities/alerta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta])],
  exports: [TypeOrmModule],
})
export class AlertasModule {}
