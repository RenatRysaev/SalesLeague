import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Auth (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const testUser = {
    name: 'E2E User',
    email: `e2e-${Date.now()}@example.com`,
    password: 'password123',
  }

  describe('POST /auth/signup', () => {
    it('создаёт нового пользователя', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email)
          expect(res.body).not.toHaveProperty('passwordHash')
        })
    })

    it('возвращает 409 если email уже занят', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(409)
    })
  })

  describe('POST /auth/signin', () => {
    it('возвращает access_token при верных данных', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token')
          expect(typeof res.body.access_token).toBe('string')
        })
    })

    it('возвращает 401 при неверном пароле', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401)
    })

    it('возвращает 401 если пользователь не существует', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401)
    })
  })
})
