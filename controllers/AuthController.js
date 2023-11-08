import User from "../models/User.js";
import emailExists from "../libraries/emailExist.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

const env = dotenv.config().parsed

const generateAccessToken = async (payload) => {
    return jwt.sign({ payload }, env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: env.JWT_ACCESS_TOKEN_TIME })
}

const generateRefreshToken = async (payload) => {
    return jwt.sign({ payload }, env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: env.JWT_REFRESH_TOKEN_TIME })
}


class AuthController {
    async register(req, res) {
        try {

            if (!req.body.fullname) {
                throw {
                    code: 400,
                    message: 'Fullname is required'
                }
            }

            if (!req.body.email) {
                throw {
                    code: 400,
                    message: 'email is required'
                }
            }

            if (!req.body.password) {
                throw {
                    code: 400,
                    message: 'Password is required'
                }
            }

            if (req.body.password.length < 6) {
                throw {
                    code: 400,
                    message: 'Password must be at least 6 characters'
                }
            }

            const isEmailExists = await emailExists(req.body.email)
            if (isEmailExists) {
                throw {
                    code: 400,
                    message: 'Email already exists'
                }
            }

            const salt = await bcrypt.genSalt(10)
            const hash = await bcrypt.hash(req.body.password, salt)

            const user = await User.create({
                fullname: req.body.fullname,
                email: req.body.email,
                password: hash,
            })
            if (!user) {
                throw {
                    code: 500,
                    message: 'User Register Failed',
                }
            }


            return res.status(200).json({
                status: true,
                message: 'User Register Success',
                data: user
            })

        } catch (error) {
            return res.status(error.code || 500).json({
                status: false,
                message: error.message,
            })
        }
    }

    async login(req, res) {
        try {

            if (!req.body.email) {
                throw {
                    code: 400,
                    message: 'Email is required'
                }
            }

            if (!req.body.password) {
                throw {
                    code: 400,
                    message: 'Password is required'
                }
            }

            const user = await User.findOne({ email: req.body.email })
            if (!user) {
                throw {
                    code: 404,
                    message: 'User not found'
                }
            }

            const isPasswordValid = await bcrypt.compareSync(req.body.password, user.password)
            if (!isPasswordValid) {
                throw {
                    code: 400,
                    message: 'Invalid password'
                }
            }

            const accessToken = await generateAccessToken({
                _id: user._id
            })

            const refreshToken = await generateRefreshToken({
                _id: user._id
            })

            return res.status(200).json({
                status: true,
                message: 'Login Success',
                fullname: user.fullname,
                accessToken,
                refreshToken
            })

        } catch (error) {
            return res.status(error.code || 500).json({
                status: false,
                message: error.message,
            })
        }
    }

    async refreshToken(req, res) {
        try {
            if (!req.body.refreshToken) {
                throw {
                    code: 400,
                    message: 'Refresh token is required'
                }
            }

            //verify refresh token
            const verify = await jwt.verify(req.body.refreshToken, env.JWT_REFRESH_TOKEN_SECRET)
            let payload = { id: verify.id }
            const accessToken = await generateAccessToken(payload)
            const refreshToken = await generateRefreshToken(payload)

            return res.status(200).json({
                status: true,
                message: 'Refresh token success',
                accessToken,
                refreshToken
            })
        }

        catch (error) {

            if (error.message === 'jwt expired') {
                error.message = 'Refresh token expired'
            } else if (error.message === 'invalid signature' ||
                error.message === 'jwt malformed' ||
                error.message === 'invalid token' ||
                error.message === 'jwt must be provided') {

                error.message = 'Refresh token invalid'
            }

            return res.status(error.code || 500).json({
                status: false,
                message: error.message,
            })
        }
    }
}

export default new AuthController()