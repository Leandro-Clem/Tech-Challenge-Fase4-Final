const { app, request, tokenFor, bearer } = require('./helpers');
const { sequelize, Post } = require('../src/database');
const { seed } = require('../src/seed');

let professor;
let aluno;

beforeAll(async () => {
    await seed({ reset: true });
    professor = await tokenFor('professor', 'professor123');
    aluno = await tokenFor('aluno', 'aluno123');
});

afterAll(() => sequelize.close());

// Professores e alunos usam a mesma implementação; os testes rodam para os dois.
describe.each([
    ['professores', 'professor'],
    ['alunos', 'aluno']
])('CRUD de /%s', (rota, role) => {
    let createdId;
    const base = `/${rota}`;

    test('aluno não acessa a administração de usuários (403)', async () => {
        const res = await request(app).get(base).set(bearer(aluno));
        expect(res.statusCode).toBe(403);
    });

    test('sem token recebe 401', async () => {
        const res = await request(app).get(base);
        expect(res.statusCode).toBe(401);
    });

    test('cria com senha e não devolve o hash', async () => {
        const res = await request(app)
            .post(base)
            .set(bearer(professor))
            .send({ name: `Novo ${role}`, username: `novo.${role}`, email: `novo.${role}@escola.br`, password: 'senha123' });

        expect(res.statusCode).toBe(201);
        expect(res.body.role).toBe(role);
        expect(res.body.password).toBeUndefined();
        createdId = res.body.id;

        // e o usuário novo consegue entrar
        const login = await request(app).post('/login').send({ username: `novo.${role}`, password: 'senha123' });
        expect(login.statusCode).toBe(200);
        expect(login.body.user.role).toBe(role);
    });

    test('valida campos obrigatórios', async () => {
        const res = await request(app).post(base).set(bearer(professor)).send({ name: 'A', username: 'X Y', password: '1' });
        expect(res.statusCode).toBe(400);
        expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['name', 'username', 'password']));
    });

    test('recusa usuário repetido (409)', async () => {
        const res = await request(app)
            .post(base)
            .set(bearer(professor))
            .send({ name: 'Repetido', username: `novo.${role}`, password: 'senha123' });
        expect(res.statusCode).toBe(409);
    });

    test('lista paginada com metadados', async () => {
        const res = await request(app).get(`${base}?page=1&limit=2`).set(bearer(professor));
        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
        expect(res.body).toMatchObject({ page: 1, limit: 2 });
        expect(res.body.total).toBeGreaterThanOrEqual(3);
        expect(res.body.totalPages).toBe(Math.ceil(res.body.total / 2));
        expect(res.body.data.every((u) => u.role === role)).toBe(true);
    });

    test('filtra a listagem por termo', async () => {
        const res = await request(app).get(`${base}?q=novo`).set(bearer(professor));
        expect(res.body.data).toHaveLength(1);
    });

    test('busca por id e 404 quando é de outro papel', async () => {
        const ok = await request(app).get(`${base}/${createdId}`).set(bearer(professor));
        expect(ok.statusCode).toBe(200);

        const outraRota = rota === 'professores' ? '/alunos' : '/professores';
        const errado = await request(app).get(`${outraRota}/${createdId}`).set(bearer(professor));
        expect(errado.statusCode).toBe(404);
    });

    test('edita sem trocar a senha quando ela vem vazia', async () => {
        const res = await request(app)
            .put(`${base}/${createdId}`)
            .set(bearer(professor))
            .send({ name: `Editado ${role}`, password: '' });

        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe(`Editado ${role}`);

        const login = await request(app).post('/login').send({ username: `novo.${role}`, password: 'senha123' });
        expect(login.statusCode).toBe(200);
    });

    test('edita a senha quando informada', async () => {
        await request(app).put(`${base}/${createdId}`).set(bearer(professor)).send({ password: 'nova456' });
        const login = await request(app).post('/login').send({ username: `novo.${role}`, password: 'nova456' });
        expect(login.statusCode).toBe(200);
    });

    test('exclui', async () => {
        const res = await request(app).delete(`${base}/${createdId}`).set(bearer(professor));
        expect(res.statusCode).toBe(200);

        const depois = await request(app).get(`${base}/${createdId}`).set(bearer(professor));
        expect(depois.statusCode).toBe(404);
    });
});

describe('Regras especiais de professores', () => {
    test('professor não exclui a própria conta', async () => {
        const me = await request(app).get('/me').set(bearer(professor));
        const res = await request(app).delete(`/professores/${me.body.id}`).set(bearer(professor));
        expect(res.statusCode).toBe(400);
    });

    test('renomear o professor atualiza o autor exibido nas publicações dele', async () => {
        const lista = await request(app).get('/professores?q=marina').set(bearer(professor));
        const marina = lista.body.data[0];

        await request(app).put(`/professores/${marina.id}`).set(bearer(professor)).send({ name: 'Marina D. Souza' });

        const posts = await Post.findAll({ where: { authorId: marina.id } });
        expect(posts.length).toBeGreaterThan(0);
        expect(posts.every((p) => p.author === 'Marina D. Souza')).toBe(true);
    });

    test('excluir professor mantém as publicações dele no ar, sem dono', async () => {
        const lista = await request(app).get('/professores?q=marina').set(bearer(professor));
        const marina = lista.body.data[0];

        const res = await request(app).delete(`/professores/${marina.id}`).set(bearer(professor));
        expect(res.statusCode).toBe(200);

        const orfas = await Post.findAll({ where: { author: 'Marina D. Souza' } });
        expect(orfas.length).toBeGreaterThan(0);
        expect(orfas.every((p) => p.authorId === null)).toBe(true);

        // e qualquer professor pode administrar publicações sem dono
        const edit = await request(app)
            .put(`/posts/${orfas[0].id}`)
            .set(bearer(professor))
            .send({ title: 'Revisado pela coordenação' });
        expect(edit.statusCode).toBe(200);
    });
});

describe('Rotas gerais', () => {
    test('health check', async () => {
        const res = await request(app).get('/health');
        expect(res.body.status).toBe('ok');
    });

    test('rota desconhecida devolve 404 em JSON', async () => {
        const res = await request(app).get('/nao-existe');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBeDefined();
    });

    test('JSON malformado devolve 400', async () => {
        const res = await request(app)
            .post('/login')
            .set('Content-Type', 'application/json')
            .send('{"username": ');
        expect(res.statusCode).toBe(400);
    });
});
