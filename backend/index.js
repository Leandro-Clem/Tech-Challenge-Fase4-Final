const { DataTypes } = require('sequelize');
const app = require('./src/app');
const { sequelize } = require('./src/database');
const { seed } = require('./src/seed');

const PORT = process.env.PORT || 3000;

/**
 * Um banco vindo da Fase 2/3 não tem as colunas novas (authorId, userId).
 * `sync()` cria tabelas que faltam, mas não altera as existentes; então
 * acrescentamos as colunas aqui, sem apagar as publicações já gravadas.
 */
async function migrarColunas() {
    const qi = sequelize.getQueryInterface();
    const posts = await qi.describeTable('Posts');
    if (!posts.authorId) await qi.addColumn('Posts', 'authorId', { type: DataTypes.INTEGER, allowNull: true });
    const comments = await qi.describeTable('Comments');
    if (!comments.userId) await qi.addColumn('Comments', 'userId', { type: DataTypes.INTEGER, allowNull: true });
}

async function start() {
    await sequelize.sync();
    await migrarColunas();

    if (process.env.SEED_ON_START !== 'false' && (await seed())) {
        console.log('Primeiro acesso: usuários de demonstração criados (professor/professor123, aluno/aluno123).');
    }

    // 0.0.0.0 para que o celular na mesma rede Wi-Fi alcance a API pelo IP da máquina.
    app.listen(PORT, '0.0.0.0', () => console.log(`API no ar em http://localhost:${PORT}`));
}

start().catch((err) => {
    console.error('Falha ao iniciar a API:', err);
    process.exit(1);
});
