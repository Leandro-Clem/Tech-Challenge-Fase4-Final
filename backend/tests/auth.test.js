const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/database');
const { seed } = require('../src/seed');

beforeAll(async () => {
    await seed({ reset: true });
});

afterAll(() => sequelize.close());

describe('Autenticação', () => {
    test('entra com usuário e senha corretos e recebe token + dados do usuário', async () => {
        const res = await request(app).post('/login').send({ username: 'professor', password: 'professor123' });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toMatchObject({ username: 'professor', role: 'professor' });
        expect(res.body.user.password).toBeUndefined();
    });

    test('ignora o username em maiúsculas/espaços', async () => {
        const res = await request(app).post('/login').send({ username: '  ALUNO ', password: 'aluno123' });
        expect(res.statusCode).toBe(200);
        expect(res.body.user.role).toBe('aluno');
    });

    test('recusa senha errada (corrige o login sem senha da Fase 2)', async () => {
        const res = await request(app).post('/login').send({ username: 'professor', password: 'errada' });
        expect(res.statusCode).toBe(401);
        expect(res.body.token).toBeUndefined();
    });

    test('não aceita escolher o papel no corpo da requisição', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'aluno', password: 'aluno123', role: 'professor' });

        expect(res.statusCode).toBe(200);
        expect(res.body.user.role).toBe('aluno');
    });

    test('usuário inexistente recebe a mesma resposta de senha errada', async () => {
        const res = await request(app).post('/login').send({ username: 'ninguem', password: 'qualquer' });
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Usuário ou senha incorretos.');
    });

    test('exige usuário e senha', async () => {
        const res = await request(app).post('/login').send({ username: 'professor' });
        expect(res.statusCode).toBe(400);
    });

    test('GET /me devolve o usuário do token', async () => {
        const login = await request(app).post('/login').send({ username: 'aluno', password: 'aluno123' });
        const res = await request(app).get('/me').set('Authorization', `Bearer ${login.body.token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.username).toBe('aluno');
    });

    test('token inválido recebe 401', async () => {
        const res = await request(app).get('/me').set('Authorization', 'Bearer abc.def.ghi');
        expect(res.statusCode).toBe(401);
    });

    test('sem token recebe 401', async () => {
        const res = await request(app).get('/me');
        expect(res.statusCode).toBe(401);
    });
});
