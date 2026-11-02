const request = require('supertest');
const app = require('../src/app');

async function tokenFor(username, password) {
    const res = await request(app).post('/login').send({ username, password });
    if (!res.body.token) throw new Error(`Login falhou para ${username}: ${JSON.stringify(res.body)}`);
    return res.body.token;
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, tokenFor, bearer };
