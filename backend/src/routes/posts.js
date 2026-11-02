const { Router } = require('express');
const { Op } = require('sequelize');
const { Post, Comment } = require('../database');
const { authorize } = require('../authMiddleware');

const router = Router();

function validatePost(body = {}, { partial = false } = {}) {
    const errors = {};
    const data = {};

    if (body.title !== undefined || !partial) {
        const title = String(body.title ?? '').trim();
        if (title.length < 3) errors.title = 'O título precisa ter pelo menos 3 caracteres.';
        else data.title = title;
    }
    if (body.content !== undefined || !partial) {
        const content = String(body.content ?? '').trim();
        if (content.length < 10) errors.content = 'O conteúdo precisa ter pelo menos 10 caracteres.';
        else data.content = content;
    }
    return { data, errors };
}

// --- AUTORIA ---
// authorize('professor') garante que quem chama é professor.
// Esta checagem garante que é o professor DONO da publicação.
// Publicações cujo autor foi excluído ficam "sem dono" e qualquer professor pode administrá-las.
async function carregarPostDoAutor(req, res) {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
        res.status(404).json({ message: 'Post não encontrado' });
        return null;
    }

    if (post.authorId !== null && post.authorId !== req.user.id) {
        res.status(403).json({
            message: 'Esta publicação é de outro professor. Apenas quem publicou pode alterá-la.'
        });
        return null;
    }

    return post;
}

// Listar todos (mais recentes primeiro)
router.get('/', async (req, res) => {
    const posts = await Post.findAll({ order: [['createdAt', 'DESC']] });
    res.json(posts);
});

// Busca por palavra-chave no título, conteúdo ou autor.
// Precisa vir ANTES de '/:id', senão "search" seria interpretado como id.
router.get('/search', async (req, res) => {
    const termo = String(req.query.q || '').trim();

    const posts = await Post.findAll({
        where: {
            [Op.or]: [
                { title: { [Op.like]: `%${termo}%` } },
                { content: { [Op.like]: `%${termo}%` } },
                { author: { [Op.like]: `%${termo}%` } }
            ]
        },
        order: [['createdAt', 'DESC']]
    });

    res.json(posts);
});

router.get('/:id', async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });
    res.json(post);
});

// Criar — o autor sai do token, nunca do corpo da requisição
router.post('/', authorize('professor'), async (req, res) => {
    const { data, errors } = validatePost(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: 'Confira os campos destacados.', errors });
    }

    const post = await Post.create({
        ...data,
        author: req.user.name || req.user.username,
        authorId: req.user.id
    });
    res.status(201).json(post);
});

// Editar — somente o autor
router.put('/:id', authorize('professor'), async (req, res) => {
    const post = await carregarPostDoAutor(req, res);
    if (!post) return;

    const { data, errors } = validatePost(req.body, { partial: true });
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: 'Confira os campos destacados.', errors });
    }

    await post.update(data);
    res.json(post);
});

// Deletar — somente o autor
router.delete('/:id', authorize('professor'), async (req, res) => {
    const post = await carregarPostDoAutor(req, res);
    if (!post) return;

    // O SQLite só aplica ON DELETE CASCADE com PRAGMA foreign_keys ligado,
    // então a limpeza dos comentários é explícita.
    await Comment.destroy({ where: { postId: post.id } });
    await post.destroy();

    res.json({ message: `O post com id ${req.params.id} foi excluído com sucesso.` });
});

// --- COMENTÁRIOS ---

router.get('/:id/comments', async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });

    const comments = await Comment.findAll({
        where: { postId: req.params.id },
        order: [['createdAt', 'ASC']]
    });
    res.json(comments);
});

// Comentar exige apenas estar autenticado (professor ou aluno)
router.post('/:id/comments', authorize(), async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });

    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ message: 'O comentário não pode ficar vazio' });

    const comment = await Comment.create({
        content,
        author: req.user.name || req.user.username,
        role: req.user.role,
        postId: post.id,
        userId: req.user.id
    });
    res.status(201).json(comment);
});

module.exports = router;
