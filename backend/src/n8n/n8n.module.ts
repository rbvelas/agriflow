import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { N8nController } from './n8n.controller';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';
import { WorkflowEjecucion } from './entities/workflow-ejecucion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LecturaSensor,
      Alerta,
      PrediccionRendimiento,
      WorkflowEjecucion,
    ]),
  ],
  controllers: [N8nController],
  exports: [TypeOrmModule],
})
export class N8nModule {}
