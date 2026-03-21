// Firestore Data Layer

const Data = {
    // ── Events ──────────────────────────────────────────

    listenToEvents(callback) {
        return db.collection('events').orderBy('order').onSnapshot(
            snapshot => {
                const events = [];
                snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
                callback(events);
            },
            error => console.error('Events listener error:', error)
        );
    },

    async addEvent(event) {
        return db.collection('events').add({
            name: event.name || 'New Event',
            date: event.date || '',
            location: event.location || '',
            address: event.address || '',
            hostedBy: event.hostedBy || '',
            dressCode: event.dressCode || '',
            rsvpDeadline: event.rsvpDeadline || '',
            eventUrl: event.eventUrl || '',
            talkingPoints: event.talkingPoints || '',
            notes: event.notes || '',
            order: event.order || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async updateEvent(id, fields) {
        return db.collection('events').doc(id).update({
            ...fields,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async deleteEvent(id) {
        const invitees = await db.collection('invitees').where('eventId', '==', id).get();
        const batch = db.batch();
        invitees.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('events').doc(id));
        return batch.commit();
    },

    // ── Invitees ────────────────────────────────────────

    listenToInvitees(eventId, callback) {
        // No orderBy — avoids needing a composite index.
        // Sorting is handled client-side in app.js.
        return db.collection('invitees')
            .where('eventId', '==', eventId)
            .onSnapshot(
                snapshot => {
                    const invitees = [];
                    snapshot.forEach(doc => invitees.push({ id: doc.id, ...doc.data() }));
                    callback(invitees);
                },
                error => console.error('Invitees listener error:', error)
            );
    },

    async addInvitee(invitee) {
        return db.collection('invitees').add({
            eventId: invitee.eventId,
            name: invitee.name || '',
            title: invitee.title || '',
            organization: invitee.organization || '',
            status: invitee.status || 'pending',
            phone: invitee.phone || '',
            email: invitee.email || '',
            notes: invitee.notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async updateInvitee(id, fields) {
        return db.collection('invitees').doc(id).update({
            ...fields,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async deleteInvitee(id) {
        return db.collection('invitees').doc(id).delete();
    },

    // ── Seed Data ───────────────────────────────────────

    async seedEvents() {
        const snapshot = await db.collection('events').get();
        if (snapshot.empty) {
            const defaults = [
                { name: 'Event 1', order: 0 },
                { name: 'Event 2', order: 1 },
                { name: 'Event 3', order: 2 }
            ];
            for (const evt of defaults) {
                await this.addEvent(evt);
            }
            console.log('Seeded 3 placeholder events');
        }
    }
};
