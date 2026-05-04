import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength, IsArray } from 'class-validator';
import { AuthService } from './auth.service';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  contrasena: string;
}

export class RegistrarDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  contrasena: string;

  @IsArray()
  roles: string[];
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/login — Obtiene JWT */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.contrasena);
    return { data: result, error: null };
  }

  /** POST /api/auth/registrar — Crea un nuevo usuario */
  @Post('registrar')
  @UseGuards(AuthGuard('jwt'))
  async registrar(@Body() dto: RegistrarDto) {
    const usuario = await this.authService.registrar(dto);
    const { hash_contrasena, ...result } = usuario as any;
    return { data: result, error: null };
  }

  /** GET /api/auth/perfil — Perfil del usuario autenticado */
  @Get('perfil')
  @UseGuards(AuthGuard('jwt'))
  async perfil(@Request() req: any) {
    const perfil = await this.authService.obtenerPerfil(req.user.id);
    return { data: perfil, error: null };
  }
}
