const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minute timeout when debugging
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  checkTokenFormat(loginRes.body.token);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  console.log(password);
  expect(loginRes.body.user).toMatchObject(user);
});

test('register', async () => {
  const user = await createRandomUser();
  const registerRes = await request(app).post('/api/auth').send(user);
  expect(registerRes.status).toBe(200);
  checkTokenFormat(registerRes.body.token);

  const { password, ...userNoPassword } = user;
  console.log(password);
  expect(registerRes.body.user).toMatchObject(userNoPassword);

  // Login with new user should succeed
  const loginRes = await request(app).put('/api/auth').send(user);
  expect(loginRes.status).toBe(200);
  checkTokenFormat(loginRes.body.token);
  expect(loginRes.body.user).toMatchObject(userNoPassword);
});

test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('update user', async () => {
  const adminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(adminUser);
  const adminAuthToken = adminLoginRes.body.token;

  // Updating user email and password should succeed
  console.log(adminUser);
  console.log(adminLoginRes.body.user.id);
  const updateRes = await request(app).put(`/api/auth/${adminLoginRes.body.user.id}`).set('Authorization', `Bearer ${adminAuthToken}`).send({ email: 'new@new.com', password: 'newpass' });
  console.log(updateRes.body);
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe('new@new.com');

  // Login with new email and password should succeed
  const loginRes = await request(app).put('/api/auth').send({ email: 'new@new.com', password: 'newpass' });
  expect(loginRes.status).toBe(200);
});

function checkTokenFormat(token) {
  expect(token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createRandomUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Diner }] };
    user.name = randomName();
    user.email = user.name + '@pizza.com';
    return user;
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    await DB.addUser(user);
  
    user.password = 'toomanysecrets';
    return user;
}