/* ============================================
   DAREVERSE — Admin Dashboard (Firebase)
   ============================================ */

const ADMIN_UID = null; // Optional hardcoded fallback

const Admin = {
    _adminCache: null,
    _listeners: [],
    _state: {
        users: [],
        challenges: [],
        proofs: [],
        gameDataByUser: {}
    },

    async isAdmin(force = false) {
        if (!force && this._adminCache !== null) return this._adminCache;

        const me = Auth.me();
        if (!me) {
            this._adminCache = false;
            return false;
        }

        if (ADMIN_UID && me.id === ADMIN_UID) {
            this._adminCache = true;
            return true;
        }

        try {
            const doc = await db.collection('admins').doc(me.id).get();
            this._adminCache = doc.exists;
            return this._adminCache;
        } catch (error) {
            console.warn('Admin check failed:', error);
            this._adminCache = false;
            return false;
        }
    },

    stopRealtime() {
        this._listeners.forEach(unsub => {
            try { unsub(); } catch (e) { console.warn('Failed to unsubscribe listener:', e); }
        });
        this._listeners = [];
    },

    renderDashboard() {
        this.renderFromState();
    },

    async startRealtime(containerId = 'admin-content') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}<div style="margin-top:0.5rem;color:var(--muted);">Loading analytics...</div></div>`;
        this.stopRealtime();

        this._listeners.push(db.collection('users').onSnapshot((snapshot) => {
            this._state.users = snapshot.docs.map(doc => doc.data());
            this.renderFromState(containerId);
        }));

        this._listeners.push(db.collection('challenges').onSnapshot((snapshot) => {
            this._state.challenges = snapshot.docs.map(doc => doc.data());
            this.renderFromState(containerId);
        }));

        this._listeners.push(db.collection('proofs').onSnapshot((snapshot) => {
            this._state.proofs = snapshot.docs.map(doc => doc.data());
            this.renderFromState(containerId);
        }));

        this._listeners.push(db.collection('gamification').onSnapshot((snapshot) => {
            const map = {};
            snapshot.docs.forEach(doc => {
                map[doc.id] = doc.data();
            });
            this._state.gameDataByUser = map;
            this.renderFromState(containerId);
        }));
    },

    renderFromState(containerId = 'admin-content') {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            const allUsers = this._state.users || [];
            const challenges = this._state.challenges || [];
            const proofs = this._state.proofs || [];
            const gameDataByUser = this._state.gameDataByUser || {};

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

            let activeCount = 0;
            allUsers.forEach(u => {
                const gd = gameDataByUser[u.id] || {};
                if (gd.lastChallengeDate && gd.lastChallengeDate >= sevenDaysStr) activeCount++;
            });

            const totalChallenges = challenges.length;
            const totalProofs = proofs.length;
            const approvedProofs = proofs.filter(p => p.approved === true).length;
            const pendingProofs = proofs.filter(p => p.approved === null).length;
            const rejectedProofs = proofs.filter(p => p.approved === false).length;
            const escalatedProofs = proofs.filter(p => p.status === 'escalated' && p.approved === null).length;

            const catCounts = {};
            challenges.forEach(c => {
                const key = c.category || 'uncategorized';
                catCounts[key] = (catCounts[key] || 0) + 1;
            });

            const diffCounts = { easy: 0, medium: 0, hard: 0 };
            challenges.forEach(c => {
                diffCounts[c.difficulty] = (diffCounts[c.difficulty] || 0) + 1;
            });

            const publicCount = challenges.filter(c => c.visibility === 'public').length;
            const friendsCount = challenges.length - publicCount;

            const creatorCounts = {};
            challenges.forEach(c => {
                creatorCounts[c.creator] = (creatorCounts[c.creator] || 0) + 1;
            });

            const topCreators = Object.entries(creatorCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const topCreatorUsers = topCreators
                .map(([uid, count]) => {
                    const user = allUsers.find(u => u.id === uid);
                    return user ? { ...user, challengeCount: count } : null;
                })
                .filter(Boolean);

            const usernames = allUsers
                .map(u => ({
                    id: u.id,
                    username: u.username || '(no username)',
                    name: u.name || 'Unknown'
                }))
                .sort((a, b) => a.username.localeCompare(b.username));

            container.innerHTML = `
            <div class="admin-stats-grid">
                <div class="admin-stat-card">
                    <div class="admin-stat-icon" style="color:var(--neon);">${icon('users', 24)}</div>
                    <div class="admin-stat-val">${allUsers.length}</div>
                    <div class="admin-stat-label">Total Users</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon" style="color:var(--green);">${icon('activity', 24)}</div>
                    <div class="admin-stat-val">${activeCount}</div>
                    <div class="admin-stat-label">Active (7d)</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon" style="color:var(--accent);">${icon('zap', 24)}</div>
                    <div class="admin-stat-val">${totalChallenges}</div>
                    <div class="admin-stat-label">Challenges</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-icon" style="color:var(--gold);">${icon('camera', 24)}</div>
                    <div class="admin-stat-val">${totalProofs}</div>
                    <div class="admin-stat-label">Proofs</div>
                </div>
            </div>

            <div class="admin-card">
                <div class="admin-card-title">${icon('inbox', 18)} Proof Verification Status</div>
                <div class="admin-bar-group">
                    <div class="admin-bar-item">
                        <div class="admin-bar-label"><span class="admin-dot" style="background:var(--green);"></span> Approved</div>
                        <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalProofs ? (approvedProofs / totalProofs * 100) : 0}%;background:var(--green);"></div></div>
                        <div class="admin-bar-val">${approvedProofs}</div>
                    </div>
                    <div class="admin-bar-item">
                        <div class="admin-bar-label"><span class="admin-dot" style="background:var(--gold);"></span> Pending</div>
                        <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalProofs ? (pendingProofs / totalProofs * 100) : 0}%;background:var(--gold);"></div></div>
                        <div class="admin-bar-val">${pendingProofs}</div>
                    </div>
                    <div class="admin-bar-item">
                        <div class="admin-bar-label"><span class="admin-dot" style="background:var(--accent);"></span> Rejected</div>
                        <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalProofs ? (rejectedProofs / totalProofs * 100) : 0}%;background:var(--accent);"></div></div>
                        <div class="admin-bar-val">${rejectedProofs}</div>
                    </div>
                    <div class="admin-bar-item">
                        <div class="admin-bar-label"><span class="admin-dot" style="background:var(--purple);"></span> Escalated</div>
                        <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalProofs ? (escalatedProofs / totalProofs * 100) : 0}%;background:var(--purple);"></div></div>
                        <div class="admin-bar-val">${escalatedProofs}</div>
                    </div>
                </div>
            </div>

            <div class="admin-row">
                <div class="admin-card" style="flex:1;">
                    <div class="admin-card-title">${icon('barChart', 18)} Category Distribution</div>
                    <div class="admin-bar-group">
                        ${Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => `
                        <div class="admin-bar-item">
                            <div class="admin-bar-label">${getCategoryIcon(cat)} ${getCategoryLabel(cat)}</div>
                            <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalChallenges ? (cnt / totalChallenges * 100) : 0}%;"></div></div>
                            <div class="admin-bar-val">${cnt}</div>
                        </div>`).join('')}
                    </div>
                </div>

                <div class="admin-card" style="flex:1;">
                    <div class="admin-card-title">${icon('target', 18)} Difficulty Split</div>
                    <div class="admin-bar-group">
                        <div class="admin-bar-item">
                            <div class="admin-bar-label"><span class="badge diff-easy">Easy</span></div>
                            <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalChallenges ? (diffCounts.easy / totalChallenges * 100) : 0}%;background:var(--green);"></div></div>
                            <div class="admin-bar-val">${diffCounts.easy}</div>
                        </div>
                        <div class="admin-bar-item">
                            <div class="admin-bar-label"><span class="badge diff-medium">Medium</span></div>
                            <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalChallenges ? (diffCounts.medium / totalChallenges * 100) : 0}%;background:var(--gold);"></div></div>
                            <div class="admin-bar-val">${diffCounts.medium}</div>
                        </div>
                        <div class="admin-bar-item">
                            <div class="admin-bar-label"><span class="badge diff-hard">Hard</span></div>
                            <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${totalChallenges ? (diffCounts.hard / totalChallenges * 100) : 0}%;background:var(--accent);"></div></div>
                            <div class="admin-bar-val">${diffCounts.hard}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="admin-row">
                <div class="admin-card" style="flex:1;">
                    <div class="admin-card-title">${icon('globe', 18)} Visibility Split</div>
                    <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                        <div class="admin-mini-stat">
                            <div style="font-size:1.5rem;font-family:var(--font-display);color:var(--purple);">${publicCount}</div>
                            <div style="font-size:0.75rem;color:var(--muted);">Public</div>
                        </div>
                        <div class="admin-mini-stat">
                            <div style="font-size:1.5rem;font-family:var(--font-display);color:var(--neon);">${friendsCount}</div>
                            <div style="font-size:0.75rem;color:var(--muted);">Friends Only</div>
                        </div>
                    </div>
                </div>

                <div class="admin-card" style="flex:1;">
                    <div class="admin-card-title">${icon('users', 18)} Usernames</div>
                    <div class="admin-users-box">
                        ${usernames.length ? usernames.map((u) => `
                            <div class="admin-user-row">
                                <span class="admin-user-handle">@${u.username}</span>
                                <span class="admin-user-name">${u.name}</span>
                            </div>
                        `).join('') : '<div style="color:var(--muted);font-size:0.85rem;">No users found</div>'}
                    </div>
                </div>
            </div>

            <div class="admin-card">
                <div class="admin-card-title">${icon('crown', 18)} Top Creators</div>
                ${topCreatorUsers.length ? topCreatorUsers.map((u, i) => `
                <div class="admin-creator-row">
                    <span class="admin-creator-rank" style="color:${i < 3 ? ['var(--gold)','var(--silver)','var(--bronze)'][i] : 'var(--muted)'};">${i + 1}</span>
                    ${avatarHTML(u, false, 'sm')}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:500;font-size:0.85rem;">${u.name}</div>
                        <div style="font-size:0.72rem;color:var(--muted);">@${u.username}</div>
                    </div>
                    <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--neon);font-weight:700;">${u.challengeCount} dares</div>
                </div>`).join('') : '<div style="color:var(--muted);font-size:0.85rem;padding:1rem 0;">No challenges yet</div>'}
            </div>
            `;
        } catch (err) {
            console.error('Admin dashboard error:', err);
            container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted);">Failed to load analytics. ${err.message}</div>`;
        }
    }
};

function initAdminApp() {
    const entry = sessionStorage.getItem('dv_admin_entry');
    const parsedEntry = (() => {
        try { return entry ? JSON.parse(entry) : null; } catch { return null; }
    })();

    if (!parsedEntry || !parsedEntry.ts || (Date.now() - parsedEntry.ts) > 120000) {
        window.location.href = 'app.html';
        return;
    }
    sessionStorage.removeItem('dv_admin_entry');

    Auth.initAuthListener(async (user) => {
        if (!user) return;

        const allowed = await Admin.isAdmin(true);
        if (!allowed) {
            window.location.href = 'app.html';
            return;
        }

        const userName = document.getElementById('admin-user-name');
        const me = Auth.me();
        if (userName && me) userName.textContent = me.name || 'Admin';

        await Admin.startRealtime('admin-content');
    });
}
