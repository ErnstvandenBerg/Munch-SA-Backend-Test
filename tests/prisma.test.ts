import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Prisma Schema', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should create and retrieve user data from the database', async () => {

        const user = await prisma.users.create({
            data: {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password',
            },
        });

        expect(user).toBeDefined();

        const retrievedUser = await prisma.users.findFirst({
            where: {
                id: user.id,
            },
        });

        expect(retrievedUser).toEqual(user);
    });

    it('should delete user data from the database', async () => {
        const user = await prisma.users.findFirst({
            where: {
                username: 'testuser',
            },
        });
        if (!user) {
            test.skip('User not found, skipping test', () => { });
            return;
        }

        await prisma.users.delete({
            where: {
                id: user.id,
            },
        });

        const deletedUser = await prisma.users.findFirst({
            where: {
                id: user.id,
            },
        });
        expect(deletedUser).toBeNull();

        console.warn('User with username "testuser" not found in the database');
    });
});