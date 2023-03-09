const dotenv = require('dotenv')

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const envFound = dotenv.config()
if (envFound.error) {
    throw new Error("Couldn't file .env file")
}

module.exports = {
    // port: parseInt(process.env.PORT, 10),
    // // databaseURL: process.env.MONGODB_URI,
    // debugNamespace: process.env.DEBUG_NAMESPACE,
    // api: {
    //     prefix: '/api'
    // },
    // app: {
    //     prefix: '/app'
    // }
    userId: process.env.USER_ID
}