/** Regras de validação compartilhadas pelas rotas de usuários. */

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublicUser(user) {
    const { id, name, username, email, role, createdAt, updatedAt } = user.get
        ? user.get({ plain: true })
        : user;
    return { id, name, username, email, role, createdAt, updatedAt };
}

/**
 * Valida o corpo de criação/edição de usuário.
 * Na edição (`partial = true`) os campos são opcionais e a senha só muda se vier preenchida.
 * Devolve { data, errors } — `errors` é um objeto campo -> mensagem.
 */
function validateUserInput(body = {}, { partial = false } = {}) {
    const errors = {};
    const data = {};

    if (body.name !== undefined || !partial) {
        const name = String(body.name ?? '').trim();
        if (name.length < 3) errors.name = 'Informe o nome completo (mínimo de 3 caracteres).';
        else data.name = name;
    }

    if (body.username !== undefined || !partial) {
        const username = String(body.username ?? '').trim().toLowerCase();
        if (!USERNAME_RE.test(username)) {
            errors.username = 'Usuário deve ter de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.';
        } else data.username = username;
    }

    if (body.email !== undefined && body.email !== null && String(body.email).trim() !== '') {
        const email = String(body.email).trim().toLowerCase();
        if (!EMAIL_RE.test(email)) errors.email = 'E-mail inválido.';
        else data.email = email;
    } else if (body.email !== undefined) {
        data.email = null;
    }

    const password = body.password === undefined || body.password === null ? '' : String(body.password);
    if (!partial || password !== '') {
        if (password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
        else data.password = password;
    }

    return { data, errors };
}

function parsePagination(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
    return { page, limit, offset: (page - 1) * limit };
}

module.exports = { toPublicUser, validateUserInput, parsePagination };
