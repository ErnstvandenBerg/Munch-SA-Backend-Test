import md5 from 'md5';
import bcrypt from 'bcrypt';
import { PrismaClient, users } from '@prisma/client'
const prisma = new PrismaClient()

const AuthGetUser = async (email: string, password: any) => {
    if (!email || !password) return false;

    try {
        const user = await prisma.users.findFirst({
            where: {
                email,
            },
        });

        if (!user || !user.password || user.password === '') return false;
        console.log(password.toString(), user.password)
        const authed = await AuthCheckPassword(password.toString(), user.password, user.id);
        console.log(authed)
        if (authed) {
            return user;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error in AuthGetUser:", error);
        throw error;
    }
};

const AuthCheckRefreshtoken: (id: string | number, refreshTokenState: string) => Promise<any> = async (id, refreshTokenState) => {
    if (!id) return false;

    try {
        const user = await prisma.users.findUnique({
            where: {
                id: typeof id === 'string' ? parseInt(id, 10) : id,
            },
        });

        if (!user) return false;

        const userState: string = md5(`${user.id}${user.email}${user.password}${user.updated_at}`);

        if (userState === refreshTokenState) {
            const returndata = {
                email: user.email,
                password: user.password
            };
            return returndata;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error in AuthCheckRefreshtoken:", error);
        throw error;
    }
};

async function AuthCheckPassword(check: string, against: string, id: string | number) {
    const hash = bcrypt.hashSync(check, 10);

    if (bcrypt.compareSync(check, against)) {
        return true;
    } else {
        try {
            if (check === against) {
                const user = await prisma.users.findUnique({
                    where: {
                        id: typeof id === 'string' ? parseInt(id, 10) : id,
                    },
                });

                if (!user) {
                    return false;
                }

                await prisma.users.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        password: hash,
                    },
                });

                return true;
            }
            return false
        } catch (error) {
            console.error("Error in AuthCheckPassword:", error);
            throw error;
        }
    }
}

export default AuthCheckPassword;

export const db = {
    AuthGetUser,
    AuthCheckRefreshtoken
};

