const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testAdmin;
let testAdminAuthToken;
let testAdminId;
let franchiseId;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minute timeout when debugging
}

beforeAll(async () => {
    // Register a test admin
    testAdmin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(testAdmin);
    testAdminAuthToken = loginRes.body.token;
    testAdminId = loginRes.body.user.id;

    // Create a franchise
    createRes = await createFranchise();
    franchiseId = createRes.body.id;
});

test('user franchise should exist after creation', async () => {
    const res = await request(app).get(`/api/franchise/${testAdminId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].id).toEqual(franchiseId);
});

test('create store', async () => {
    const createRes = await createStore(franchiseId);
    const storeName = createRes.body.name;
    expect(createRes.statusCode).toEqual(200);
    
    const res = await request(app).get(`/api/franchise/${testAdminId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(res.body[0].stores.length).toEqual(1);
    expect(res.body[0].stores[0].name).toEqual(storeName);
});

test('delete store', async () => {
    const createRes = await createStore(franchiseId);
    storeId = createRes.body.id;    
    storeName = createRes.body.name;

    const deleteRes = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(deleteRes.statusCode).toEqual(200);
    const getRes = await request(app).get(`/api/franchise/${testAdminId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(getRes.body[0].stores.map(s => s.name)).not.toContain(storeName);
});

test('delete franchise', async () => {
    const createRes = await createFranchise();
    franchiseId = createRes.body.id;

    const deleteRes = await request(app).delete(`/api/franchise/${franchiseId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(deleteRes.statusCode).toEqual(200);
    const getRes = await request(app).get(`/api/franchise/${testAdminId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(getRes.body.length).toEqual(1);
});

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createFranchise() {
    const franchise = { name: randomName(), admins: [ testAdmin ] };
    return await request(app).post('/api/franchise').send(franchise).set('Authorization', `Bearer ${testAdminAuthToken}`);
}

async function createStore(franchiseId) {
    const store = { franchiseId, name: randomName() };
    return await request(app).post(`/api/franchise/${franchiseId}/store`).send(store).set('Authorization', `Bearer ${testAdminAuthToken}`);
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    await DB.addUser(user);
  
    user.password = 'toomanysecrets';
    return user;
}