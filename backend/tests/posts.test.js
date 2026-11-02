const { app, request, tokenFor, bearer } = require('./helpers');
const { sequelize } = require('../src/database');
const { seed } = require('../src/seed');

let professor;
let outroProfessor;
let aluno;
let postId;

beforeAll(async () => {
    await seed({ reset: true });
    professor = await tokenFor('professor', 'professor123');
    outroProfessor = await tokenFor('marina', 'marina123');
    aluno = await tokenFor('aluno', 'aluno123');
});

afterAll(() => sequelize.close());

describe('Posts — leitura pública', () => {
    test('lista os posts sem autenticação, mais recentes primeiro', async () => {
        const res = await request(app).get('/posts');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
        const datas = res.body.map((p) => new Date(p.createdAt).getTime());
        expect([...datas].sort((a, b) => b - a)).toEqual(datas);
    });

    test('busca por palavra no título ou conteúdo', async () => {
        const res = await request(app).get('/posts/search?q=fotoss');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toMatch(/Fotossíntese/);
    });

    test('busca também pelo nome do autor', async () => {
        const res = await request(app).get('/posts/search?q=Marina');
        expect(res.body.every((p) => p.author === 'Marina Duarte')).toBe(true);
    });

    test('404 para post inexistente', async () => {
        const res = await request(app).get('/posts/9999');
        expect(res.statusCode).toBe(404);
    });
});

describe('Posts — escrita', () => {
    test('professor cria post e o autor vem do token', async () => {
        const res = await request(app)
            .post('/posts')
            .set(bearer(professor))
            .send({ title: 'Teste unitário', content: 'Conteúdo de teste sobre ciclo da água', author: 'Outra Pessoa' });

        expect(res.statusCode).toBe(201);
        expect(res.body.author).toBe('Leandro Clemente');
        postId = res.body.id;
    });

    test('valida título e conteúdo', async () => {
        const res = await request(app).post('/posts').set(bearer(professor)).send({ title: 'a', content: '' });
        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toHaveProperty('title');
        expect(res.body.errors).toHaveProperty('content');
    });

    test('aluno não pode criar post (403)', async () => {
        const res = await request(app)
            .post('/posts')
            .set(bearer(aluno))
            .send({ title: 'Post de aluno', content: 'Não deveria ser publicado' });
        expect(res.statusCode).toBe(403);
    });

    test('sem token não pode criar post (401)', async () => {
        const res = await request(app).post('/posts').send({ title: 'x', content: 'y' });
        expect(res.statusCode).toBe(401);
    });

    test('autor edita o próprio post', async () => {
        const res = await request(app)
            .put(`/posts/${postId}`)
            .set(bearer(professor))
            .send({ title: 'Título atualizado' });

        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Título atualizado');
        expect(res.body.content).toBe('Conteúdo de teste sobre ciclo da água');
    });

    test('outro professor não edita nem exclui post alheio (403)', async () => {
        const put = await request(app).put(`/posts/${postId}`).set(bearer(outroProfessor)).send({ title: 'Invasão' });
        const del = await request(app).delete(`/posts/${postId}`).set(bearer(outroProfessor));
        expect(put.statusCode).toBe(403);
        expect(del.statusCode).toBe(403);
    });

    test('aluno não edita post (403)', async () => {
        const res = await request(app).put(`/posts/${postId}`).set(bearer(aluno)).send({ title: 'Aluno' });
        expect(res.statusCode).toBe(403);
    });
});

describe('Comentários', () => {
    let commentId;

    test('aluno autenticado comenta', async () => {
        const res = await request(app)
            .post(`/posts/${postId}/comments`)
            .set(bearer(aluno))
            .send({ content: 'Ótima explicação!' });

        expect(res.statusCode).toBe(201);
        expect(res.body.role).toBe('aluno');
        expect(res.body.author).toBe('Aluno Demonstração');
        commentId = res.body.id;
    });

    test('lista comentários publicamente', async () => {
        const res = await request(app).get(`/posts/${postId}/comments`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    test('comentário vazio é recusado', async () => {
        const res = await request(app).post(`/posts/${postId}/comments`).set(bearer(aluno)).send({ content: '  ' });
        expect(res.statusCode).toBe(400);
    });

    test('professor que não é dono do post não modera', async () => {
        const res = await request(app).delete(`/comments/${commentId}`).set(bearer(outroProfessor));
        expect(res.statusCode).toBe(403);
    });

    test('dono do post remove o comentário', async () => {
        const res = await request(app).delete(`/comments/${commentId}`).set(bearer(professor));
        expect(res.statusCode).toBe(200);
    });
});

describe('Exclusão de post', () => {
    test('autor exclui o post e os comentários dele', async () => {
        await request(app).post(`/posts/${postId}/comments`).set(bearer(aluno)).send({ content: 'Mais um' });

        const res = await request(app).delete(`/posts/${postId}`).set(bearer(professor));
        expect(res.statusCode).toBe(200);

        const depois = await request(app).get(`/posts/${postId}`);
        expect(depois.statusCode).toBe(404);
    });
});
