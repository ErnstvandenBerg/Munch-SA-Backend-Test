import jwt from 'jsonwebtoken';
import { db } from '../../db';
import md5 from 'md5';
import express from 'express';
import verify from '../../utils/verify';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient()
// import statusCode from '../utils/statusCodeSender'
export const auth = express.Router();

let refreshTokens: any[] = [];

const accessTokenSECRET: any = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSECRET: any = process.env.REFRESH_TOKEN_SECRET;

//user login
auth.post('/user/login', async (req, res) => {

    const email: string = req.body.email;
    const password: string = req.body.password;

    try {
        //checks user password and gets user data
        const dbUser = await db.AuthGetUser(email, String(password));

        if (dbUser) {
            const user = {
                email,
                id: dbUser.id,
                username: dbUser.username
            };

            const state = md5(`${dbUser.id}${dbUser.email}${dbUser.password}${dbUser.updated_at}`);

            const userRefresh = {
                id: dbUser.id,
                email,
                state
            };
            //generate new access token and refresh token
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(userRefresh);

            refreshTokens.push(refreshToken);

            return res.json({ accessToken, refreshToken });
        } else {
            return res.sendStatus(401);
        }
    } catch (err) {

        return res.sendStatus(500);
    }
});
//generate new access token bassed in refresh token
auth.post('/token', (req, res) => {

    const refreshToken = req.body.token
    if (refreshToken === null) return res.sendStatus(401)
    if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)

    jwt.verify(refreshToken, refreshTokenSECRET, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403)
        }
        const accessToken = generateAccessToken({ email: user.email, id: user.id, user_status: user.user_status, firstname: user.firstname, lastname: user.lastname, role_id: user.role_id })
        res.send({ accessToken })
    })
});
//generate new access and refresh token bassed in refresh token
auth.post('/refresh', async (req, res) => {

    let refreshToken = req.body.token;
    if (refreshToken === null) return res.sendStatus(401);

    const expirationCheck: any = jwt.verify(refreshToken, refreshTokenSECRET, (err: any, decodedtoken: any) => {

        if (err) {
            return false;
        }
        return true;
    })
    if (expirationCheck === false) { return res.sendStatus(401) }


    const decoded: any = jwt.decode(refreshToken);
    let refreshCheck = false;
    if (!decoded.id) {
        return res.sendStatus(401)
    }

    if (decoded.id) {
        refreshCheck = await db.AuthCheckRefreshtoken(decoded.id, decoded.state);

    } else {
        return res.sendStatus(401)
    }

    if (refreshCheck) {

        const dbUser = await prisma.users.findFirst({
            where: {
                id: decoded.id,
            },
        });
        if (dbUser === null) {
            return res.sendStatus(401)
        }
        const userAccess =
        {
            email: dbUser.email,
            id: dbUser.id,
            username: dbUser.username
        }

        const state = md5(`${dbUser.id}${dbUser.email}${dbUser.password}${dbUser.updated_at}`);

        const userRefresh =
        {
            id: dbUser.id,
            email: dbUser.email,
            state
        }

        const accessToken = generateAccessToken(userAccess)
        refreshToken = jwt.sign(userRefresh, refreshTokenSECRET, { expiresIn: '1d' })
        refreshTokens.push(refreshToken);
        res.send({ accessToken, refreshToken })
    }
    else {
        return res.sendStatus(401);
    }
});

//removes refresh tokens
auth.delete('/logout', (req, res) => {
    refreshTokens = refreshTokens.filter(token => token !== req.body.token)
    res.sendStatus(204)
});

export function generateAccessToken(user: {}) {

    const expiresIn = '1d';

    return jwt.sign(user, accessTokenSECRET, { expiresIn })
}
export function generateRefreshToken(user: {}) {

    const expiresIn = '1d';

    return jwt.sign(user, refreshTokenSECRET, { expiresIn });
}