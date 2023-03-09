const expressLoader = require('./express')
const { getFirestore } = require('firebase-admin/firestore')

module.exports = ({ expressApp }) => {
     // Load DB
    const db = getFirestore()
    db.settings({ ignoreUndefinedProperties: true })
    console.log('DB Loaded and connected')

    // Load express routes
    expressLoader({ app: expressApp })
    console.log('Express loaded')
}