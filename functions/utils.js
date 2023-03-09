function verifyPayload(payload) {
    const verified = {}
    Object.entries(payload).forEach(([key, value]) => {
        if(value) verified[key] = value
    })
    return verified
}

function parseTaskDates(task) {
    return {
        ...task,
        start: isDate(task.start) ? task.start.toJSON() : task.start,
        end: isDate(task.end) ? task.end.toJSON() : task.end
    }
}

function isDate(timestamp) {
    return timestamp instanceof Date
}

// From Cloud Firestore docs
async function deleteQueryBatch(db, query, resolve, count) {
    let localCount = count ? count : 0
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve({ deletedCount: localCount });
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        ++localCount
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, localCount);
    });
}

module.exports = {
    verifyPayload, parseTaskDates, isDate, deleteQueryBatch
}