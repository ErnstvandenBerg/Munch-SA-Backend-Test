import { db } from '../db';
import jwt from 'jsonwebtoken';

// user token authentication

export = (req: any, res: any, next: any) => {

    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return res.sendStatus(401)
    console.log(token, process.env.ACCESS_TOKEN_SECRET)
    try {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "", (err: any, user: any) => {
            if (err) {
                console.log(err, "verify");
                return res.sendStatus(403)
            }
            req.user = user
            next()
        })
    }
    catch (err) {
        return res.sendStatus(403).send('Token Error');
    }
}
