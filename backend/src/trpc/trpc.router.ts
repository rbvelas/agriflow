import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { PrediccionesService } from '../predicciones/predicciones.service';
import { ReportesService } from '../reportes/reportes.service';
import { SensoresService } from '../sensores/sensores.service';
import { RiegosService } from '../riegos/riegos.service';
import { FincasService } from '../fincas/fincas.service';

const t = initTRPC.context<{
  req: any;
  res: any;
}>().create();

const router = t.router;
const publicProcedure = t.procedure;

/**
 * Definición de los sub-routers para inferencia de tipos más robusta.
 */
const prediccionesRouter = (trpcRouter: TrpcRouter) => router({
  /** Obtiene o genera la predicción más reciente para una temporada */
  obtener: publicProcedure
    .input(z.object({ temporadaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const pred = await trpcRouter.prediccionesService.obtenerPrediccion(
        input.temporadaId,
      );
      return { data: pred, error: null };
    }),

  /** Lista el historial de predicciones de una temporada */
  listar: publicProcedure
    .input(
      z.object({
        temporadaId: z.string().uuid(),
        limite: z.number().min(1).max(100).default(30),
      }),
    )
    .query(async ({ input }) => {
      const lista = await trpcRouter.prediccionesService.listarPredicciones(
        input.temporadaId,
        input.limite,
      );
      return { data: lista, meta: { total: lista.length }, error: null };
    }),
});

const reportesRouter = (trpcRouter: TrpcRouter) => router({
  /** Genera un nuevo reporte PDF de forma asíncrona */
  generar: publicProcedure
    .input(
      z.object({
        fincaId: z.string().uuid().optional(),
        loteId: z.string().uuid().optional(),
        tipo: z.enum([
          'operacional_diario',
          'operacional_semanal',
          'gestion_mensual',
          'ejecutivo',
        ]),
        periodoInicio: z.string().datetime(),
        periodoFin: z.string().datetime(),
        usuarioId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const reporte = await trpcRouter.reportesService.generarReporte({
        ...input,
        periodoInicio: new Date(input.periodoInicio),
        periodoFin: new Date(input.periodoFin),
      });
      return { data: reporte, error: null };
    }),
});

const sensoresRouter = (trpcRouter: TrpcRouter) => router({
  /** Lista alertas activas (o todas) de un lote */
  listarAlertas: publicProcedure
    .input(
      z.object({
        loteId: z.string().uuid(),
        soloActivas: z.boolean().default(true),
      }),
    )
    .query(async ({ input }) => {
      const alertas = await trpcRouter.sensoresService.listarAlertas(
        input.loteId,
        input.soloActivas,
      );
      return { data: alertas, meta: { total: alertas.length }, error: null };
    }),

  /** Lecturas de los últimos N horas de un lote */
  ultimasLecturas: publicProcedure
    .input(
      z.object({
        loteId: z.string().uuid(),
        horas: z.number().min(1).max(168).default(24),
      }),
    )
    .query(async ({ input }) => {
      const lecturas = await trpcRouter.sensoresService.ultimasLecturas(
        input.loteId,
        input.horas,
      );
      return { data: lecturas, error: null };
    }),

  /** Estadísticas de un sensor en un período */
  estadisticas: publicProcedure
    .input(
      z.object({
        sensorId: z.string().uuid(),
        horas: z.number().min(1).max(720).default(24),
      }),
    )
    .query(async ({ input }) => {
      const stats = await trpcRouter.sensoresService.estadisticasSensor(
        input.sensorId,
        input.horas,
      );
      return { data: stats, error: null };
    }),

  /** Resuelve una alerta */
  resolverAlerta: publicProcedure
    .input(
      z.object({
        alertaId: z.string().uuid(),
        usuarioId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const alerta = await trpcRouter.sensoresService.resolverAlerta(
        input.alertaId,
        input.usuarioId,
      );
      return { data: alerta, error: null };
    }),
});

const riegosRouter = (trpcRouter: TrpcRouter) => router({
  /** Calcula lámina de riego recomendada para una temporada */
  calcularRecomendacion: publicProcedure
    .input(z.object({ temporadaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rec = await trpcRouter.riegosService.calcularRecomendacion(
        input.temporadaId,
      );
      return { data: rec, error: null };
    }),

  /** Registra un evento de riego (recomendación ± aplicación) */
  registrarEvento: publicProcedure
    .input(
      z.object({
        loteId: z.string().uuid(),
        temporadaId: z.string().uuid().optional(),
        laminaRecomendadaMm: z.number().min(0),
        laminaAplicadaMm: z.number().min(0).optional(),
        metodo: z.string().optional(),
        notas: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const evento = await trpcRouter.riegosService.registrarEvento(input);
      return { data: evento, error: null };
    }),

  /** Lista eventos de riego en un rango de fechas */
  listarEventos: publicProcedure
    .input(
      z.object({
        loteId: z.string().uuid(),
        desde: z.string().datetime(),
        hasta: z.string().datetime(),
      }),
    )
    .query(async ({ input }) => {
      const eventos = await trpcRouter.riegosService.listarEventos(
        input.loteId,
        new Date(input.desde),
        new Date(input.hasta),
      );
      return { data: eventos, meta: { total: eventos.length }, error: null };
    }),
});

const fincasRouter = (trpcRouter: TrpcRouter) => router({
  /** Lista fincas según el rol del usuario en sesión */
  listar: publicProcedure.query(async ({ ctx }) => {
    const user = ctx.req.user;
    if (!user) return { data: [], error: 'Usuario no autenticado en tRPC' };
    const fincas = await trpcRouter.fincasService.listarPorRol(user);
    return { data: fincas, meta: { total: fincas.length }, error: null };
  }),
});

/**
 * Router tRPC principal — AgriFlow.
 * Expone procedimientos type-safe para el frontend Next.js.
 * Organizado en sub-routers por dominio de negocio.
 */
@Injectable()
export class TrpcRouter {
  constructor(
    public readonly prediccionesService: PrediccionesService,
    public readonly reportesService: ReportesService,
    public readonly sensoresService: SensoresService,
    public readonly riegosService: RiegosService,
    public readonly fincasService: FincasService,
  ) {}

  appRouter = router({
    predicciones: prediccionesRouter(this),
    reportes: reportesRouter(this),
    sensores: sensoresRouter(this),
    riegos: riegosRouter(this),
    fincas: fincasRouter(this),
  });
}

export type AppRouter = TrpcRouter['appRouter'];

