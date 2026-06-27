import { Role } from '../../../generated/prisma/client'

export class CreateUserDto {
  name: string
  email: string
  password: string
  role?: Role
}
