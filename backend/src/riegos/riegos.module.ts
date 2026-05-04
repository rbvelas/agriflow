import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiegosService } from './riegos.service';
import { RiegosController } from './riegos.controller';
import { EventoRiego } from './entities/evento-riego.entity';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { Temporada } from '../temporadas/entities/temporada.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventoRiego, LecturaSensor, Temporada])],
  controllers: [RiegosController],
  providers: [RiegosService],
  exports: [RiegosService],
})
export class RiegosModule {}
