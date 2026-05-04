// temporadas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemporadasService } from './temporadas.service';
import { TemporadasController } from './temporadas.controller';
import { Temporada } from './entities/temporada.entity';
import { Cultivo } from './entities/cultivo.entity';
import { Sensor } from '../sensores/entities/sensor.entity';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Temporada,
      Cultivo,
      Sensor,
      LecturaSensor,
      PrediccionRendimiento,
    ]),
  ],
  controllers: [TemporadasController],
  providers: [TemporadasService],
  exports: [TemporadasService],
})
export class TemporadasModule {}
