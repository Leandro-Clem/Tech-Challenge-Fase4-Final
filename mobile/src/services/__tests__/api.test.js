import api, { ApiError, setAuthToken, setUnauthorizedHandler, usersApi } from '../api';

jest.mock('../../config', () => ({ API_URL: 'http://api.test' }));

function respond(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

afterEach(() => {
  setAuthToken(null);
  setUnauthorizedHandler(null);
});

describe('services/api', () => {
  test('login envia usuário e senha', async () => {
    respond(200, { token: 't', user: { id: 1 } });
    await api.login('professor', 'professor123');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://api.test/login');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ username: 'professor', password: 'professor123' });
  });

  test('rotas protegidas enviam o token Bearer', async () => {
    setAuthToken('abc');
    respond(201, { id: 3 });
    await api.createPost({ title: 'x', content: 'y' });
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  test('sem token, rota protegida falha antes de chamar a rede', async () => {
    global.fetch = jest.fn();
    await expect(api.deletePost(1)).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('erro da API vira ApiError com status e erros por campo', async () => {
    setAuthToken('abc');
    respond(400, { message: 'Confira os campos destacados.', errors: { title: 'curto' } });

    const error = await api.createPost({}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Confira os campos destacados.');
    expect(error.fieldErrors).toEqual({ title: 'curto' });
  });

  test('401 numa rota autenticada avisa o AuthContext (sessão vencida)', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    setAuthToken('vencido');
    respond(401, { message: 'Sessão inválida ou expirada.' });

    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalled();
  });

  test('falha de rede vira mensagem amigável com status 0', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(api.listPosts()).rejects.toMatchObject({ status: 0 });
  });

  test('cancelamento relatado como falha de rede (Android) vira AbortError', async () => {
    const controller = new AbortController();
    global.fetch = jest.fn(() => {
      controller.abort();
      return Promise.reject(new TypeError('Network request failed'));
    });

    await expect(api.searchPosts('fra', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('a busca codifica o termo', async () => {
    respond(200, []);
    await api.searchPosts('ciências & artes');
    expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/posts/search?q=ci%C3%AAncias%20%26%20artes');
  });

  test('CRUD de usuários usa /professores e /alunos com paginação', async () => {
    setAuthToken('abc');
    respond(200, { data: [] });
    await usersApi('professor').list({ page: 2, limit: 5, q: '' });
    expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/professores?page=2&limit=5');

    respond(200, {});
    await usersApi('aluno').update(4, { name: 'Ana' });
    expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/alunos/4');
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT');

    respond(200, {});
    await usersApi('aluno').remove(4);
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
  });
});
