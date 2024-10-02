const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testAdmin = { name: 'admin', password: 'adminPass', roles: [{ role: Role.Admin }] };
let testAdminAuthToken;
let adminId;
let franchiseId;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minute timeout when debugging
}

beforeAll(async () => {
    // Register a test admin
    testAdmin.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testAdmin);
    testAdminAuthToken = registerRes.body.token;
    adminId = registerRes.body.user.id;

    // Create a franchise
    const franchise = { name: randomName(), admins: [ testAdmin ] };
    await DB.createFranchise(franchise);
    franchiseId = franchise.id;
});

test('get user franchises', async () => {
    const res = await request(app).get(`/api/franchise/${adminId}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].id).toEqual(franchiseId);
});

// test('create franchise', async () => {
//     const newAdmin = await createAdminUser();
//     console.log(newAdmin);
//     const newFranchiseName = randomName();
//     const newFranchise = { name: newFranchiseName, admins: [ newAdmin ] };
//     const adminKey = await getAdminKey(newAdmin);
//     const res = await request(app).post('/api/franchise').send(newFranchise).set('Authorization', `Bearer ${adminKey}`);
//     console.log(res.body);
//     expect(res.statusCode).toEqual(200);

//     const franchises = await request(app).get(`/api/franchise/${newAdmin.id}`).set('Authorization', `Bearer ${adminKey}`);
//     expect(franchises.body.length).toEqual(1);
//     expect(franchises.body[0].name).toEqual(newFranchiseName);
// });

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function getAdminKey(admin) {
    const res = await request(app).post('/api/auth').send(admin);
    console.log(res.body.user);
    return res.body.token;
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    await DB.addUser(user);
  
    user.password = 'toomanysecrets';
    return user;
}