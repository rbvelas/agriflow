import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { Reporte } from './entities/reporte.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { EventoRiego } from '../riegos/entities/evento-riego.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reporte,
      Lote,
      LecturaSensor,
      PrediccionRendimiento,
      Alerta,
      EventoRiego,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
