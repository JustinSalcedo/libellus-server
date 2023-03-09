const { getFirestore } = require('firebase-admin/firestore')

const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

module.exports = db