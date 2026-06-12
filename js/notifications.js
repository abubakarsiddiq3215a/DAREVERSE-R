/* ============================================
   DAREVERSE — Real-Time Notifications (Firestore)
   ============================================ */

const Notifications = {
    unsubscribe: null, // Firestore listener unsubscribe function
    unreadCount: 0,

    /**
     * Start listening for real-time notifications
     */
    startListener(userId) {
        if (this.unsubscribe) this.unsubscribe(); // Clean up previous

        this.unsubscribe = db.collection('notification')
            .where('to', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(30)
            .onSnapshot((snapshot) => {
                // Count unread
                let unread = 0;
                snapshot.forEach(doc => {
                    if (!doc.data().read) unread++;
                });
                this.unreadCount = unread;
                this.updateBadge();

                // Show toast for new real-time notifications
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const n = change.doc.data();
                        // Only toast if it's recent (within last 5 seconds)
                        const ts = n.timestamp ? new Date(n.timestamp).getTime() : 0;
                        if (Date.now() - ts < 5000) {
                            this.showToast(n);
                        }
                    }
                });
            }, (err) => {
                console.warn('Notification listener error:', err);
            });
    },

    /**
     * Update the notification bell badge count
     */
    updateBadge() {
        const badge = document.getElementById('notif-count');
        const mobBadge = document.getElementById('mob-notif-count');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
        if (mobBadge) {
            mobBadge.textContent = this.unreadCount;
            mobBadge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Show a toast for a new notification
     */
    showToast(n) {
        const messages = {
            'friend_request':       `${n.fromName} sent you a friend request!`,
            'friend_accepted':      `${n.fromName} accepted your friend request!`,
            'challenge_sent':       `${n.fromName} challenged you: "${n.challengeName}"`,
            'challenge_completed':  `${n.fromName} completed your challenge!`,
            'challenge_accepted':   `${n.fromName} accepted your public challenge!`,
            'proof_approved':       `Your proof was approved! +${n.points || 0} pts`,
            'proof_rejected':       `Your proof was rejected`
        };
        const msg = messages[n.type] || n.message || 'New notification';
        const toastType = n.type.includes('reject') ? 'error' : n.type.includes('approved') ? 'success' : 'info';
        toast(msg, toastType);
    },

    /**
     * Send a notification
     */
    async send(toId, type, data = {}) {
        const me = Auth.me();
        if (!me || toId === me.id) return; // Don't notify yourself

        const notif = {
            id: 'n' + Date.now() + Math.random().toString(36).substr(2, 4),
            to: toId,
            from: me.id,
            fromName: me.name || me.username || 'Player',
            type,
            read: false,
            timestamp: new Date().toISOString(),
            ...data
        };

        // Filter undefined fields from notif to prevent Firestore errors
        Object.keys(notif).forEach(key => {
            if (notif[key] === undefined) {
                delete notif[key];
            }
        });

        await db.collection('notification').doc(notif.id).set(notif);
    },

    /**
     * Render the notification panel
     */
    async renderPanel() {
        const me = Auth.me();
        const panel = document.getElementById('notif-panel');
        if (!panel) return;

        panel.innerHTML = `<div style="text-align:center;padding:1.5rem;">${icon('clock', 24)}</div>`;

        const snapshot = await db.collection('notification')
            .where('to', '==', me.id)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const notifs = snapshot.docs.map(d => d.data());

        if (!notifs.length) {
            panel.innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--muted);">
                ${icon('bell', 32)}
                <div style="margin-top:0.5rem;font-size:0.85rem;">No notifications yet</div>
            </div>`;
            return;
        }

        panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border);">
            <span style="font-weight:600;font-size:0.9rem;">Notifications</span>
            <div style="display:flex;gap:0.4rem;">
                <button class="btn btn-xs btn-ghost" onclick="Notifications.markAllRead()">Mark all read</button>
                <button class="btn btn-xs btn-ghost" style="color:var(--accent);" onclick="Notifications.clearAll()">Clear all</button>
            </div>
        </div>
        ${notifs.map(n => this.notifItemHTML(n)).join('')}`;
    },

    /**
     * Notification item HTML
     */
    notifItemHTML(n) {
        const icons = {
            'friend_request':      'userPlus',
            'friend_accepted':     'checkCircle',
            'challenge_sent':      'zap',
            'challenge_completed': 'award',
            'challenge_accepted':  'globe',
            'proof_approved':      'checkCircle',
            'proof_rejected':      'xCircle'
        };
        const colors = {
            'friend_request':      'var(--neon)',
            'friend_accepted':     'var(--green)',
            'challenge_sent':      'var(--accent)',
            'challenge_completed': 'var(--gold)',
            'challenge_accepted':  'var(--purple)',
            'proof_approved':      'var(--green)',
            'proof_rejected':      'var(--accent)'
        };

        const messages = {
            'friend_request':      `<strong>${n.fromName}</strong> sent you a friend request`,
            'friend_accepted':     `<strong>${n.fromName}</strong> accepted your friend request`,
            'challenge_sent':      `<strong>${n.fromName}</strong> challenged you: "${n.challengeName || ''}"`,
            'challenge_completed': `<strong>${n.fromName}</strong> completed your challenge`,
            'challenge_accepted':  `<strong>${n.fromName}</strong> accepted your public challenge`,
            'proof_approved':      `Your proof was <strong style="color:var(--green);">approved</strong>! +${n.points || 0} pts`,
            'proof_rejected':      `Your proof was <strong style="color:var(--accent);">rejected</strong>`
        };

        const ic = icons[n.type] || 'bell';
        const color = colors[n.type] || 'var(--muted)';
        const msg = messages[n.type] || n.message || 'Notification';
        const unread = !n.read ? 'background:rgba(255,60,111,0.06);' : '';
        const time = n.timestamp ? formatDate(n.timestamp) : '';

        return `
        <div class="notif-item" style="${unread}">
            <div class="notif-icon" style="color:${color};">${icon(ic, 18)}</div>
            <div class="notif-body" onclick="Notifications.markRead('${n.id}')">
                <div class="notif-msg">${msg}</div>
                <div class="notif-time">${time}</div>
            </div>
            ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
            <button class="notif-remove-btn" onclick="Notifications.remove('${n.id}')" title="Remove">${icon('x', 14)}</button>
        </div>`;
    },

    /**
     * Mark a single notification as read
     */
    async markRead(notifId) {
        await db.collection('notification').doc(notifId).update({ read: true });
    },

    /**
     * Mark all notifications as read
     */
    async markAllRead() {
        const me = Auth.me();
        const snapshot = await db.collection('notification')
            .where('to', '==', me.id)
            .where('read', '==', false)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        toast('All marked as read', 'info');
        this.renderPanel();
    },

    /**
     * Remove a single notification
     */
    async remove(notifId) {
        await db.collection('notification').doc(notifId).delete();
        toast('Notification removed');
        this.renderPanel();
    },

    /**
     * Clear all notifications
     */
    async clearAll() {
        const me = Auth.me();
        const snapshot = await db.collection('notification')
            .where('to', '==', me.id)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        toast('All notifications cleared', 'info');
        this.renderPanel();
    },

    /**
     * Toggle the notification panel open/close
     */
    togglePanel() {
        const overlay = document.getElementById('notifPanelOverlay');
        if (overlay) {
            overlay.classList.toggle('open');
            if (overlay.classList.contains('open')) {
                this.renderPanel();
            }
        }
    }
};
