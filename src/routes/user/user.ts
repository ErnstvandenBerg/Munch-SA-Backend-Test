import express, { Request, Response } from 'express';
import verify from '../../utils/verify';
import jwt_decoder from '../../utils/jwt_decoder';
import statusCode from '../../utils/statusCodeSender';
import bcrypt from "bcrypt";
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
export const userRoute = express.Router();
const prisma = new PrismaClient();

//get user data bassed on id in token
userRoute.get('/', verify, async (req, res) => {
    try {
        const jwtUser: any = await jwt_decoder(req);

        const user = await prisma.users.findUnique({
            where: {
                id: jwtUser.id
            },
            select: {
                id: true,
                username: true,
                email: true,
                password: false
            }
        });

        if (!user) {
            return res.status(404).send({ statusCode: 404, message: "User not found" });
        }

        return res.send({ statusCode: 0, user });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ statusCode: 500, message: "Internal Server Error" });
    }
});

const validateUser = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isStrongPassword().withMessage('Password must be a Strong Password'),
    body('username').isString().withMessage('Username cannot be empty and needs to be string'),
    body('confirmPassword').isString().withMessage('confirmPassword cannot be empty and needs to be string'),
    async (req: Request, res: Response, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

//create new user
userRoute.post('/', validateUser, async (req: Request, res: Response) => {
    try {

        const user = {
            email: req.body.email,
            password: req.body.password,
            username: req.body.username,
            confirmPassword: req.body.confirmPassword
        };

        if (user.password !== user.confirmPassword) {
            return res.status(400).send(statusCode.CodeSender("U6"));
        }

        const existingUser = await prisma.users.findFirst({
            where: {
                username: user.username
            }
        });

        if (existingUser) {
            return res.status(400).send(statusCode.CodeSender("U7"));
        }

        const hash = bcrypt.hashSync(user.password.toString(), 10);
        console.log(hash)
        const newUser = await prisma.users.create({
            data: {
                email: user.email,
                password: hash,
                username: user.username
            }
        });

        if (newUser) {
            return res.send({ statusCode: 0, message: "User Created Successfully" });
        } else {
            console.error(`User couldn't be added ${JSON.stringify(user)}`);
            return res.status(400).send({ message: "Failed Creating User" });
        }
    } catch (error) {
        console.error("Error while adding user:", error);
        return res.status(500).send({ message: "Failed Creating User" });
    }
});

