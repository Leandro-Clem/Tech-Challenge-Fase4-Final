const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../database');
const { authorize, signToken } = require('../authMiddleware');
const { toPublicUser } = require('../validation');

const router = Router();

// --- LOGIN COM SENHA (corrige o apontamento da Fase 2) ---
// Antes o corpo trazia { username, role } e qualquer pessoa entrava como professor.
// Agora o papel vem do cadastro do usuário, nunca do corpo da requisição.
router.post('/login', async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
        return res.status(400).json({ message: 'Informe usuário e senha.' });
    }

    const user = await User.scope('withPassword').findOne({ where: { username } });

    // Mesma mensagem para usuário inexistente e senha errada:
    // não revelamos quais usuários existem.
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) {
        return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    res.json({
        message: `Login realizado como ${user.role}`,
        token: signToken(user),
        user: toPublicUser(user)
    });
});

// Dados do usuário logado (o app usa ao reabrir, para validar o token salvo)
router.get('/me', authorize(), async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ message: 'Usuário não existe mais. Entre novamente.' });
    res.json(toPublicUser(user));
});

module.exports = router;
