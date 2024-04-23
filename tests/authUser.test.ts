import request from 'supertest';
import express from 'express';
import { auth } from "../src/routes/auth/auth";
import { db } from '../src/db';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { userRoute } from '../src/routes/user/user';

dotenv.config({ path: '.env' });

const app = express();
app.use(express.json());
app.use('/auth', auth);
app.use('/users', userRoute);
let accessToken = ""

describe('Login and User API', () => {
    it('should return 200 OK and tokens on successful login', async () => {
        const response = await request(app)
            .post('/auth/user/login')
            .send({ email: 'ernst@gmail.com', password: 'a' });
        accessToken = response.body.accessToken
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 Unauthorized on invalid credentials', async () => {
        const response = await request(app)
            .post('/auth/user/login')
            .send({ email: 'invalid@example.com', password: 'invalidpassword' });
        expect(response.status).toBe(401);
    });

    it('should return 500 Internal Server Error on database error', async () => {
        jest.spyOn(db, 'AuthGetUser').mockRejectedValue(new Error('Database error'));
        const response = await request(app)
            .post('/auth/user/login')
            .send({ email: 'example@example.com', password: 'password' });

        expect(response.status).toBe(500);
    });

    it('should return user details for valid token in Authorization header', async () => {
        const mockUser = { id: 1, username: 'ernst', email: 'ernst@gmail.com' };
        const response = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ statusCode: 0, user: mockUser });
    });

    it('should return error message if token is invalid', async () => {
        const response = await request(app)
            .get('/users')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
    });
});
