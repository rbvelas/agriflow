import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FincasService, CrearFincaDto } from './fincas.service';

@Controller('api/fincas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FincasController {
  constructor(private readonly fincasService: FincasService) {}

  @Post()
  @Roles('administrador', 'agricultor')
  async crear(@Body() dto: CrearFincaDto, @Request() req: any) {
    const finca = await this.fincasService.crear({
      ...dto,
      propietarioId: req.user.id,
    });
    return { data: finca, error: null };
  }

  @Get()
  @Roles('administrador', 'agricultor', 'tecnico')
  async listar(@Request() req: any) {
    const fincas = await this.fincasService.listarPorRol(req.user);
    return { data: fincas, meta: { total: fincas.length }, error: null };
  }

  @Get(':id')
  @Roles('administrador', 'agricultor', 'tecnico')
  async obtener(@Param('id') id: string, @Request() req: any) {
    const finca = await this.fincasService.obtenerConLotes(id);
    
    // Validar propiedad para agricultores
    const userRoleNames = req.user.roles.map((r: any) => 
      (typeof r === 'string' ? r : r.nombre).toLowerCase().trim()
    );
    
    if (userRoleNames.includes('agricultor') && finca.propietario?.id !== req.user.id) {
      // El admin y tecnico pueden ver cualquier finca
      if (!userRoleNames.includes('administrador') && !userRoleNames.includes('tecnico')) {
        throw new ForbiddenException('No tiene permiso para ver esta finca');
      }
    }
    
    return { data: finca, error: null };
  }

  @Patch(':id')
  @Roles('administrador', 'agricultor')
  async actualizar(@Param('id') id: string, @Body() dto: Partial<CrearFincaDto>, @Request() req: any) {
    // Validar propiedad
    const finca = await this.fincasService.obtenerConLotes(id);
    const userRoleNames = req.user.roles.map((r: any) => 
      (typeof r === 'string' ? r : r.nombre).toLowerCase().trim()
    );
    
    if (userRoleNames.includes('agricultor') && finca.propietario?.id !== req.user.id) {
      if (!userRoleNames.includes('administrador')) {
        throw new ForbiddenException('No tiene permiso para modificar esta finca');
      }
    }

    const actualizada = await this.fincasService.actualizar(id, dto);
    return { data: actualizada, error: null };
  }

  @Delete(':id')
  @Roles('administrador', 'agricultor')
  async eliminar(@Param('id') id: string, @Request() req: any) {
    // Validar propiedad
    const finca = await this.fincasService.obtenerConLotes(id);
    const userRoleNames = req.user.roles.map((r: any) => 
      (typeof r === 'string' ? r : r.nombre).toLowerCase().trim()
    );
    
    if (userRoleNames.includes('agricultor') && finca.propietario?.id !== req.user.id) {
      if (!userRoleNames.includes('administrador')) {
        throw new ForbiddenException('No tiene permiso para eliminar esta finca');
      }
    }

    await this.fincasService.eliminar(id);
    return { data: { eliminado: true }, error: null };
  }
}
