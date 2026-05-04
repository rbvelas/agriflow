import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Auth
import { AuthModule } from './auth/auth.module';
import { Usuario } from './auth/entities/usuario.entity';
import { Rol } from './auth/entities/rol.entity';

// Fincas / Lotes
import { FincasModule } from './fincas/fincas.module';
import { Finca } from './fincas/entities/finca.entity';
import { Lote } from './lotes/entities/lote.entity';
import { LotesModule } from './lotes/lotes.module';

// Temporadas / Cultivos
import { TemporadasModule } from './temporadas/temporadas.module';
import { Temporada } from './temporadas/entities/temporada.entity';
import { Cultivo } from './temporadas/entities/cultivo.entity';

// Alertas
import { AlertasModule } from './alertas/alertas.module';

// Sensores
import { SensoresModule } from './sensores/sensores.module';
import { Sensor } from './sensores/entities/sensor.entity';
import { LecturaSensor } from './sensores/entities/lectura-sensor.entity';

// Riegos
import { RiegosModule } from './riegos/riegos.module';
import { EventoRiego } from './riegos/entities/evento-riego.entity';

// Predicciones
import { PrediccionesModule } from './predicciones/predicciones.module';
import { PrediccionRendimiento } from './predicciones/entities/prediccion-rendimiento.entity';

// Reportes
import { ReportesModule } from './reportes/reportes.module';
import { Reporte } from './reportes/entities/reporte.entity';

// Alertas
import { Alerta } from './alertas/entities/alerta.entity';

// n8n
import { N8nModule } from './n8n/n8n.module';
import { WorkflowEjecucion } from './n8n/entities/workflow-ejecucion.entity';

// tRPC
import { TrpcModule } from './trpc/trpc.module';

const ALL_ENTITIES = [
  Usuario,
  Rol,
  Finca,
  Lote,
  Cultivo,
  Temporada,
  Sensor,
  LecturaSensor,
  EventoRiego,
  PrediccionRendimiento,
  Reporte,
  Alerta,
  WorkflowEjecucion,
];

// Trigger restart: 2026-05-03 12:00
@Module({
  imports: [
    // Config global
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // TypeORM — PostgreSQL
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const databaseUrl = cfg.get('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: ALL_ENTITIES,
            synchronize: false,
            ssl: { rejectUnauthorized: false },
            extra: {
              ssl: { rejectUnauthorized: false },   // ← clave para forzar
            },
            logging: false,
          };
        }
        return {
          type: 'postgres',
          host: cfg.get('POSTGRES_HOST', 'localhost'),
          port: cfg.get<number>('POSTGRES_PORT', 5432),
          database: cfg.get('POSTGRES_DB', 'agriflow'),
          username: cfg.get('POSTGRES_USER', 'agriflow_user'),
          password: cfg.get('POSTGRES_PASSWORD', ''),
          entities: ALL_ENTITIES,
          synchronize: false,
          ssl: cfg.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
          logging: false,
        };
      },
    }),

    // HTTP para llamadas al ML service
    HttpModule,

    // Módulos de dominio
    AuthModule,
    FincasModule,
    LotesModule,
    TemporadasModule,
    AlertasModule,
    SensoresModule,
    RiegosModule,
    PrediccionesModule,
    ReportesModule,
    N8nModule,
    TrpcModule,
  ],
})
export class AppModule { }
