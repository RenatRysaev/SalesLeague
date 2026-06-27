import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common'
import { LocalGuard } from './local/local.guard'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { CreateUserDto } from '../users/dto/create-user.dto'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @UseGuards(LocalGuard)
  @Post('signin')
  signin(@Req() req: any) {
    return this.authService.auth(req.user)
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken)
  }

  @Get('me')
  me(@Req() req: any) {
    const { passwordHash, ...user } = req.user
    return user
  }
}
