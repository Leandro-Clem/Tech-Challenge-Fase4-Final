const bcrypt = require('bcryptjs');
const { sequelize, User, Post, Comment } = require('./database');

/**
 * Dados iniciais para o primeiro acesso.
 * Sem eles ninguém conseguiria entrar: só professores cadastram professores.
 *
 *   professor / professor123
 *   aluno     / aluno123
 */
const USERS = [
    { name: 'Leandro Clemente', username: 'professor', email: 'professor@escola.edu.br', password: 'professor123', role: 'professor' },
    { name: 'Marina Duarte', username: 'marina', email: 'marina@escola.edu.br', password: 'marina123', role: 'professor' },
    { name: 'Aluno Demonstração', username: 'aluno', email: 'aluno@escola.edu.br', password: 'aluno123', role: 'aluno' },
    { name: 'Pedro Lima', username: 'pedro', email: null, password: 'pedro123', role: 'aluno' }
];

const POSTS = [
    {
        by: 'professor',
        title: 'Fotossíntese em 5 minutos',
        content:
            'A fotossíntese é o processo em que as plantas transformam luz, água e gás carbônico em glicose e oxigênio.\n\n' +
            'Ela acontece nos cloroplastos, graças à clorofila, o pigmento verde que absorve a luz.\n\n' +
            'Exercício: liste três fatores que aumentam a velocidade da fotossíntese.'
    },
    {
        by: 'marina',
        title: 'Frações sem medo',
        content:
            'Uma fração representa partes de um inteiro. Em 3/4, o 4 diz em quantas partes o inteiro foi dividido e o 3 quantas pegamos.\n\n' +
            'Para somar frações com denominadores diferentes, primeiro encontre o mínimo múltiplo comum.'
    },
    {
        by: 'professor',
        title: 'Como estudar para a prova de História',
        content:
            'Monte uma linha do tempo com os acontecimentos principais e, para cada um, escreva uma causa e uma consequência.\n\n' +
            'Revise em blocos curtos de 25 minutos com pausas de 5.'
    }
];

async function seed({ reset = false } = {}) {
    if (reset) await sequelize.sync({ force: true });

    const existing = await User.count();
    if (existing > 0) return false;

    const created = {};
    for (const user of USERS) {
        created[user.username] = await User.create({
            ...user,
            password: await bcrypt.hash(user.password, 10)
        });
    }

    for (const post of POSTS) {
        const owner = created[post.by];
        await Post.create({ title: post.title, content: post.content, author: owner.name, authorId: owner.id });
    }

    const first = await Post.findOne({ order: [['id', 'ASC']] });
    const aluno = created.aluno;
    await Comment.create({
        content: 'Ficou bem mais claro com o exemplo, obrigado!',
        author: aluno.name,
        role: 'aluno',
        postId: first.id,
        userId: aluno.id
    });

    return true;
}

if (require.main === module) {
    seed({ reset: process.argv.includes('--reset') })
        .then((done) => {
            console.log(done ? 'Banco populado com os dados de demonstração.' : 'O banco já tinha usuários; nada foi alterado.');
            return sequelize.close();
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { seed, USERS };
