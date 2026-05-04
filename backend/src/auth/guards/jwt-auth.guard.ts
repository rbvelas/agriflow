import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT reutilizable para proteger rutas REST en NestJS.
 * Uso: @UseGuards(JwtAuthGuard) sobre controladores o métodos.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
