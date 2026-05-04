import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PrediccionesService } from './predicciones.service';
import { PrediccionesController } from './predicciones.controller';
import { PrediccionRendimiento } from './entities/prediccion-rendimiento.entity';
import { Temporada } from '../temporadas/entities/temporada.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrediccionRendimiento, Temporada]),
    HttpModule,
  ],
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
  exports: [PrediccionesService],
})
export class PrediccionesModule {}
