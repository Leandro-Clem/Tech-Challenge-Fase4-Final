const { Sequelize, DataTypes } = require('sequelize');

// O arquivo do banco vem de variável de ambiente para que os testes possam
// usar um banco em memória (':memory:') sem tocar no arquivo de desenvolvimento.
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
});

const ROLES = ['professor', 'aluno'];

// --- NOVO NA FASE 4 ---
// Usuários reais com senha. Na Fase 2 o login aceitava qualquer nome + papel;
// agora professores e alunos são cadastrados e a senha é guardada com hash bcrypt.
const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [ROLES] }
    }
}, {
    // O hash da senha nunca sai da API: o escopo padrão o remove das consultas.
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: { include: ['password'] } } }
});

// Postagens. `author` guarda o nome exibido; `authorId` liga ao usuário dono,
// para que a regra "só o autor altera" não dependa de um texto que pode mudar.
const Post = sequelize.define('Post', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Comentários das postagens (Fase 3). Autor e papel vêm do token JWT.
const Comment = sequelize.define('Comment', {
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'aluno'
    }
});

User.hasMany(Post, { foreignKey: 'authorId', onDelete: 'SET NULL' });
Post.belongsTo(User, { foreignKey: 'authorId', as: 'owner' });

Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'SET NULL' });
Comment.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Post, Comment, ROLES };
