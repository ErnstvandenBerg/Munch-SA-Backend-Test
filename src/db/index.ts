import mysql from 'mysql';
import md5 from 'md5';
import bcrypt from 'bcrypt';
// import { cLog } from '../utils/logger';
// import delay from 'delay';

type value = string | number | undefined | null;

const pool = mysql.createPool({
    connectionLimit: 10,
    // @ts-ignore: Object is possibly 'null'. mysql://bcf84717d88516:fd8336ad@eu-cdbr-west-03.cleardb.net/heroku_f78f841ae9c3c96?reconnect=true
    host: process.env.CLEARDB_DATABASE_URL.replace("mysql://", "").match(/@(.*?)\//)[0].replace(':', "").replace("@", '').replace("/", ''),// || process.env.MYSQL_HOST,
    // @ts-ignore: Object is possibly 'null'.
    password: process.env.CLEARDB_DATABASE_URL.replace("mysql://", "").match(/:(.*?)@/)[0].replace(':', "").replace("@", ''),// || process.env.MYSQL_PASS,
    // @ts-ignore: Object is possibly 'null'.
    user: process.env.CLEARDB_DATABASE_URL.replace("mysql://", "").split(":")[0],// || process.env.MYSQL_USER,
    // @ts-ignore: Object is possibly 'null'.
    database: process.env.CLEARDB_DATABASE_URL.replace("mysql://", "").split("/")[1].split("?")[0],// || process.env.MYSQL_DB,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    timezone: '+02:00'
})

const AuthGetUser: (email: string, password: any) => Promise<any> = (email, password) => {
    return new Promise((resolve, reject) => {

        if (!email) return resolve(false);
        if (!password) return resolve(false);

        pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email], async (err, res) => {
            if (err) {
                return reject(err);
            }

            if (res.length < 1) return resolve(false)
            if (!res[0].password) return resolve(false);
            if (res[0].password === '') return resolve(false);

            const authed: any = await AuthCheckPassword(password.toString(), res[0].password, res[0].id);
            if (authed) {
                delete res.password;
                return resolve(res[0]);
            }
            else {
                return resolve(false);
            }
        })
    });
}

const AuthCheckRefreshtoken: (id: string | number, refreshTokenState: string) => Promise<any> = (id, refreshTokenState) => {
    return new Promise((resolve, reject) => {

        if (id) {
            pool.query('SELECT * FROM users WHERE id=?', [id], (err, res) => {
                if (err) {

                    return resolve(false)
                }
                const userInfo = res[0];

                const userState: string = md5(`${userInfo.id}${userInfo.email}${userInfo.password}${userInfo.updated_at}`);

                if (userState === refreshTokenState) {
                    const returndata = {
                        email: userInfo.email,
                        password: userInfo.password
                    };
                    return resolve(returndata);
                } else {

                    return resolve(false);
                }
            })
        }
        else {

            return resolve(false);
        }

    })
}

function AuthCheckPassword(check: string, against: string, id: string | number) {
    return new Promise((resolve, reject) => {
        const hash = bcrypt.hashSync(check, 10);

        if (bcrypt.compareSync(check, against)) {
            return resolve(true)

        } else {

            if (check === against) {
                if (id) {
                    pool.query('UPDATE users SET password=? WHERE id=?', [hash, id], (err, res) => {
                        if (err) {
                            return resolve(false)
                        }
                        return resolve(true);
                    })
                }
                else {
                    return resolve(true);
                }
            }
            else {
                return resolve(false);
            }
        }
    })
}

const asyncPool: (sql: string, args: value[]) => Promise<any> = (sql: string, args: value[]) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, args, (err: any, res: any) => {
            if (err) {
                console.log(err)
                return reject(err)
            }
            return resolve(res);
        })
    })
}

export const db = {
    AuthGetUser,
    AuthCheckRefreshtoken,
    asyncPool
};