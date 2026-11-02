const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');

const app = express();

// O app nativo não precisa de CORS, mas a versão web do Expo e o front da Fase 3 precisam.
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/', authRoutes);                          // POST /login, GET /me
app.use('/posts', postRoutes);                     // CRUD de posts + comentários
app.use('/comments', commentRoutes);               // DELETE /comments/:id
app.use('/professores', userRoutes('professor'));  // CRUD paginado de professores
app.use('/alunos', userRoutes('aluno'));           // CRUD paginado de alunos

app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

// Express 5 encaminha erros de handlers async para cá automaticamente.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON inválido no corpo da requisição.' });
    }
    if (process.env.NODE_ENV !== 'test') console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
});

module.exports = app;
