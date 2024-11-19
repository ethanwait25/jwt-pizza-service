const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testAdmin;
let testAdminAuthToken;
let newMenuItem;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minute timeout when debugging
}

beforeAll(async () => {
    // Register a test admin
    testAdmin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(testAdmin);
    testAdminAuthToken = loginRes.body.token;
    testAdmin.id = loginRes.body.user.id;

    // Add menu item
    newMenuItem = { title: randomName(), description: "Test", image: 'test.png', price: 0.0001 };
    const addMenuRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testAdminAuthToken}`).send(newMenuItem);
    newMenuItem.id = addMenuRes.body.find(item => item.title === newMenuItem.title).id;
    console.log('newMenuItem:', newMenuItem);
});

test('user menu item should exist after creation', async () => {
    const getRes = await request(app).get('/api/order/menu');
    console.log(getRes.body);
    expect(getRes.body).toContainEqual(newMenuItem);
});

test('create and get created order', async () => {
    // Create franchise
    const createFranchiseRes = await createFranchise();
    const franchiseId = createFranchiseRes.body.id;

    // Create store
    const createStoreRes = await createStore(franchiseId);
    const storeId = createStoreRes.body.id;

    // Create order
    const order = { franchiseId, storeId, items: [ newMenuItem ] };
    const createOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testAdminAuthToken}`).send(order);
    order.id = createOrderRes.body.order.id;
    expect(createOrderRes.statusCode).toEqual(200);
    expect(createOrderRes.body.order).toEqual(order);

    // Verify order in user orders
    const getOrdersRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testAdminAuthToken}`);
    const orderIds = getOrdersRes.body.orders.map(order => order.id);
    expect(orderIds).toContain(order.id);
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