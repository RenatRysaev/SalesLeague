export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh-change-me-in-production',
}
