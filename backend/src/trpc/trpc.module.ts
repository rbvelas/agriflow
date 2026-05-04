import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TrpcRouter } from './trpc.router';
import { PrediccionesModule } from '../predicciones/predicciones.module';
import { ReportesModule } from '../reportes/reportes.module';
import { SensoresModule } from '../sensores/sensores.module';
import { RiegosModule } from '../riegos/riegos.module';
import { PrediccionesService } from '../predicciones/predicciones.service';
import { ReportesService } from '../reportes/reportes.service';
import { SensoresService } from '../sensores/sensores.service';
import { RiegosService } from '../riegos/riegos.service';
import { FincasModule } from '../fincas/fincas.module';
import { FincasService } from '../fincas/fincas.service';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    PrediccionesModule,
    ReportesModule,
    SensoresModule,
    RiegosModule,
    FincasModule,
    AuthModule,
  ],
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcModule implements NestModule {
  constructor(
    private readonly trpcRouter: TrpcRouter,
    private readonly jwtService: JwtService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        trpcExpress.createExpressMiddleware({
          router: this.trpcRouter.appRouter,
          createContext: ({ req, res }) => {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              const token = authHeader.split(' ')[1];
              try {
                const user = this.jwtService.verify(token);
                // Mapear sub a id para consistencia con lo que espera el service
                (req as any).user = { ...user, id: user.sub };
              } catch (e) {
                // Token inválido, req.user quedará undefined
              }
            }
            return { req, res };
          },
        }),
      )
      .forRoutes('/trpc');
  }
}
