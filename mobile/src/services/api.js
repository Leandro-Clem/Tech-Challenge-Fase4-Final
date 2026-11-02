import { API_URL } from '../config';

/**
 * Camada única de acesso ao back-end. Nenhuma tela chama fetch diretamente.
 *
 * Endpoints consumidos:
 *   POST   /login                       { username, password } -> { token, user }
 *   GET    /me                          (Bearer)
 *
 *   GET    /posts                       público
 *   GET    /posts/search?q=             público
 *   GET    /posts/:id                   público
 *   POST   /posts                       (Bearer, professor)
 *   PUT    /posts/:id                   (Bearer, professor autor)
 *   DELETE /posts/:id                   (Bearer, professor autor)
 *
 *   GET    /posts/:id/comments          público
 *   POST   /posts/:id/comments          (Bearer, qualquer perfil)
 *   DELETE /comments/:id                (Bearer, dono do post ou autor do comentário)
 *
 *   GET    /professores?page&limit&q    (Bearer, professor) -> { data, page, totalPages, total }
 *   GET    /professores/:id             (Bearer, professor)
 *   POST   /professores                 (Bearer, professor)
 *   PUT    /professores/:id             (Bearer, professor)
 *   DELETE /professores/:id             (Bearer, professor)
 *   ... e as mesmas cinco rotas em /alunos
 */

/** Erro de API com o status HTTP e os erros por campo preservados. */
export class ApiError extends Error {
  constructor(message, status, fieldErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// O token fica aqui, em memória; o AuthContext é quem o persiste e o restaura.
let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token || null;
}

/** O AuthContext registra aqui o que fazer quando a API responder 401 (sessão vencida). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

export async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    if (!authToken) throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', 401);
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Requisição cancelada de propósito (a tela saiu ou uma busca nova substituiu a anterior).
    // No Android o fetch do React Native pode relatar o cancelamento como
    // "Network request failed"; por isso olhamos o sinal, e não o nome do erro.
    if (signal?.aborted || error?.name === 'AbortError') {
      const aborted = new Error('Requisição cancelada');
      aborted.name = 'AbortError';
      throw aborted;
    }
    throw new ApiError(
      `Não foi possível falar com o servidor (${API_URL}). Verifique se a API está no ar e se o celular está na mesma rede.`,
      0,
    );
  }

  const raw = await response.text();
  const data = raw ? safeJson(raw) : null;

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) || `A requisição falhou (HTTP ${response.status}).`;
    if (response.status === 401 && auth && onUnauthorized) onUnauthorized();
    throw new ApiError(message, response.status, data?.errors || null);
  }

  return data;
}

const qs = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

/** Gera o CRUD de usuários de um papel ('professores' ou 'alunos'). */
function usersResource(resource) {
  return {
    list: ({ page = 1, limit = 10, q = '' } = {}, signal) =>
      request(`/${resource}?${qs({ page, limit, q })}`, { auth: true, signal }),
    get: (id, signal) => request(`/${resource}/${id}`, { auth: true, signal }),
    create: (user) => request(`/${resource}`, { method: 'POST', body: user, auth: true }),
    update: (id, user) => request(`/${resource}/${id}`, { method: 'PUT', body: user, auth: true }),
    remove: (id) => request(`/${resource}/${id}`, { method: 'DELETE', auth: true }),
  };
}

export const api = {
  login: (username, password) =>
    request('/login', { method: 'POST', body: { username, password } }),
  me: () => request('/me', { auth: true }),

  listPosts: (signal) => request('/posts', { signal }),
  searchPosts: (term, signal) => request(`/posts/search?${qs({ q: term })}`, { signal }),
  getPost: (id, signal) => request(`/posts/${id}`, { signal }),
  createPost: (post) => request('/posts', { method: 'POST', body: post, auth: true }),
  updatePost: (id, post) => request(`/posts/${id}`, { method: 'PUT', body: post, auth: true }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE', auth: true }),

  listComments: (postId, signal) => request(`/posts/${postId}/comments`, { signal }),
  createComment: (postId, content) =>
    request(`/posts/${postId}/comments`, { method: 'POST', body: { content }, auth: true }),
  deleteComment: (commentId) => request(`/comments/${commentId}`, { method: 'DELETE', auth: true }),

  teachers: usersResource('professores'),
  students: usersResource('alunos'),
};

/** Atalho usado pelas telas genéricas de usuários: role 'professor' | 'aluno'. */
export function usersApi(role) {
  return role === 'professor' ? api.teachers : api.students;
}

export default api;
