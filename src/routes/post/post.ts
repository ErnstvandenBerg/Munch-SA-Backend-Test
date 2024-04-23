import express from 'express';
import verify from '../../utils/verify';
import jwt_decoder from '../../utils/jwt_decoder';
import statusCode from '../../utils/statusCodeSender';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { Request, Response } from 'express';
export const postRoute = express.Router();
const prisma = new PrismaClient();

//create new post
postRoute.post('/create', [
    body('message').isLength({ max: 280 }).withMessage('Message must be less than or equal to 280 characters')
], verify, async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const jwtUser: any = await jwt_decoder(req);
        const message = req.body.message;

        //gets usernames that have been tagged in the request
        const taggedUsernames = message.match(/@(\w+)/g)?.map((username: string) => username.slice(1));

        const newPost = await prisma.posts.create({
            data: {
                user_id: jwtUser.id,
                message: message
            }
        });

        if (typeof taggedUsernames !== "undefined" && taggedUsernames.length > 0) {
            for (let i = 0; i < taggedUsernames.length; i++) {
                const element = taggedUsernames[i];

                const existingUser = await prisma.users.findFirst({
                    where: {
                        username: element
                    }
                });

                if (existingUser) {
                    await prisma.post_user_mention.create({
                        data: {
                            user_id: existingUser.id,
                            post_id: newPost.id
                        }
                    });
                }
            }
        }

        if (newPost) {
            return res.send(statusCode.CodeSender("1"));
        } else {
            return res.status(400).send(statusCode.CodeSender("P1"));
        }
    } catch (error) {
        console.log(error)
        return res.status(500).send(statusCode.CodeSender("0"));
    }
});
//shows a users timeline that contains posts they made and posts they are tagged in
postRoute.get('/timeline', verify, async (req: Request, res: Response) => {
    try {
        const jwtUser: any = await jwt_decoder(req);

        const userPosts = await prisma.posts.findMany({
            where: {
                OR: [
                    { user_id: jwtUser.id },
                    { post_user_mention: { some: { user_id: jwtUser.id } } }
                ]
            },
            include: {
                user: true,
                post_user_mention: false
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return res.send(userPosts);
    } catch (error) {
        console.error(error);
        return res.status(500).send(statusCode.CodeSender("0"));
    }
});
//shows all the posts
postRoute.get('/feed', verify, async (req: Request, res: Response) => {
    try {

        const allPosts = await prisma.posts.findMany({
            include: {
                user: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return res.send(allPosts);
    } catch (error) {
        console.error(error);
        return res.status(500).send(statusCode.CodeSender("0"));
    }
});