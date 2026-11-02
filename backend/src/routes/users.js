const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Post } = require('../database');
const { authorize } = require('../authMiddleware');
const { toPublicUser, validateUserInput, parsePagination } = require('../validation');

/**
 * Fábrica do CRUD de usuários de um papel.
 * As rotas /professores e /alunos são idênticas, mudando só o papel gravado —
 * por isso uma única implementação atende os requisitos 5 a 8 do desafio.
 *
 * Só professores administram usuários (cadastram outros professores e alunos).
 */
function userRoutes(role) {
    const router = Router();
    const label = role === 'professor' ? 'Professor' : 'Aluno';

    router.use(authorize('professor'));

    async function findOr404(req, res) {
        const user = await User.findOne({ where: { id: req.params.id, role } });
        if (!user) res.status(404).json({ message: `${label} não encontrado` });
        return user;
    }

    async function usernameTaken(username, exceptId) {
        const where = { username };
        if (exceptId) where.id = { [Op.ne]: exceptId };
        return Boolean(await User.findOne({ where }));
    }

    // Listagem paginada: GET /professores?page=1&limit=10&q=maria
    router.get('/', async (req, res) => {
        const { page, limit, offset } = parsePagination(req.query);
        const termo = String(req.query.q || '').trim();

        const where = { role };
        if (termo) {
            where[Op.or] = [
                { name: { [Op.like]: `%${termo}%` } },
                { username: { [Op.like]: `%${termo}%` } },
                { email: { [Op.like]: `%${termo}%` } }
            ];
        }

        const { rows, count } = await User.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit,
            offset
        });

        res.json({
            data: rows.map(toPublicUser),
            page,
            limit,
            total: count,
            totalPages: Math.max(1, Math.ceil(count / limit))
        });
    });

    router.get('/:id', async (req, res) => {
        const user = await findOr404(req, res);
        if (user) res.json(toPublicUser(user));
    });

    router.post('/', async (req, res) => {
        const { data, errors } = validateUserInput(req.body);
        if (Object.keys(errors).length) {
            return res.status(400).json({ message: 'Confira os campos destacados.', errors });
        }
        if (await usernameTaken(data.username)) {
            return res.status(409).json({
                message: 'Este usuário já está em uso.',
                errors: { username: 'Este usuário já está em uso.' }
            });
        }

        const created = await User.create({
            ...data,
            role,
            password: await bcrypt.hash(data.password, 10)
        });

        res.status(201).json(toPublicUser(created));
    });

    router.put('/:id', async (req, res) => {
        const user = await findOr404(req, res);
        if (!user) return;

        const { data, errors } = validateUserInput(req.body, { partial: true });
        if (Object.keys(errors).length) {
            return res.status(400).json({ message: 'Confira os campos destacados.', errors });
        }
        if (data.username && (await usernameTaken(data.username, user.id))) {
            return res.status(409).json({
                message: 'Este usuário já está em uso.',
                errors: { username: 'Este usuário já está em uso.' }
            });
        }
        if (data.password) data.password = await bcrypt.hash(data.password, 10);

        await user.update(data);

        // Se o nome do professor mudou, as publicações dele passam a exibir o nome novo.
        if (role === 'professor' && data.name) {
            await Post.update({ author: data.name }, { where: { authorId: user.id } });
        }

        res.json(toPublicUser(user));
    });

    router.delete('/:id', async (req, res) => {
        const user = await findOr404(req, res);
        if (!user) return;

        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Você não pode excluir a sua própria conta.' });
        }

        if (role === 'professor') {
            const restantes = await User.count({ where: { role: 'professor' } });
            if (restantes <= 1) {
                return res.status(400).json({ message: 'É preciso manter pelo menos um professor cadastrado.' });
            }
        }

        // As publicações permanecem no ar (com o nome do autor), apenas sem dono.
        await Post.update({ authorId: null }, { where: { authorId: user.id } });
        await user.destroy();

        res.json({ message: `${label} excluído com sucesso.` });
    });

    return router;
}

module.exports = userRoutes;
