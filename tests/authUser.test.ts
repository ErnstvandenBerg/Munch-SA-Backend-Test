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
        const PostResponse = await request(app)
            .post('/users')
            .send({
                "email": "test123@gmail.com",
                "password": "User123!",
                "confirmPassword": "User123!",
                "username": "test123"
            });

        const response = await request(app)
            .post('/auth/user/login')
            .send({ email: 'test123@gmail.com', password: 'User123!' });
        accessToken = response.body.accessToken
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 Unauthorized on invalid credentials', async () => {
        const response = await request(app)
            .post('/auth/user/login')
            .send({ email: 'test123@gmail.com', password: 'invalidpassword' });
        expect(response.status).toBe(401);
    });

    it('should return 500 Internal Server Error on database error', async () => {
        jest.spyOn(db, 'AuthGetUser').mockRejectedValue(new Error('Database error'));
        const response = await request(app)
            .post('/auth/user/login')
            .send({ email: 'test123@gmail.com', password: 'User123!' });

        expect(response.status).toBe(500);
    });

    it('should return user details for valid token in Authorization header', async () => {
        const mockUser = { email: 'test123@gmail.com', username: 'test123' };
        const response = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.username).toEqual(mockUser.username);
        expect(response.body.user.email).toEqual(mockUser.email);
    });

    it('should return error message if token is invalid', async () => {
        const response = await request(app)
            .get('/users')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
    });
});
