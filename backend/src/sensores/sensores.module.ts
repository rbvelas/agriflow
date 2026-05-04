import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensoresService } from './sensores.service';
import { SensoresController } from './sensores.controller';
import { Sensor } from './entities/sensor.entity';
import { LecturaSensor } from './entities/lectura-sensor.entity';
import { Alerta } from '../alertas/entities/alerta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sensor, LecturaSensor, Alerta])],
  controllers: [SensoresController],
  providers: [SensoresService],
  exports: [SensoresService, TypeOrmModule],
})
export class SensoresModule {}
