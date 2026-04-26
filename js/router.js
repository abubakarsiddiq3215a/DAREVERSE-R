/* ============================================
   DAREVERSE — Router / Navigation (Firebase)
   ============================================ */

let currentPage = 'feed';

async function showPage(name) {
    currentPage = name;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Desktop nav
    document.querySelectorAll('header nav button').forEach(b => b.classList.remove('active'));
    // Bottom nav
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));

    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');

    const navBtn = document.getElementById('nav-' + name);
    if (navBtn) navBtn.classList.add('active');

    const mobBtn = document.getElementById('mob-' + name);
    if (mobBtn) mobBtn.classList.add('active');

    await renderPage(name);
    window.scrollTo(0, 0);
}

async function renderPage(name) {
    switch (name) {
        case 'feed': await renderFeed('all'); break;
        case 'challenges': await renderChallenges('created'); break;
        case 'friends': await renderFriends('friends'); break;
        case 'proofs': await renderProofs(); break;
        case 'leaderboard': await renderLeaderboard('friends'); break;
        case 'profile': await renderProfile(); break;
    }
}

async function initApp() {
    // Firebase Auth is async, so we use the listener
    Auth.initAuthListener(async (user) => {
        if (!user) return; // Auth.js will redirect to login

        const me = Auth.me();
        
        // Set user badge in header (with profile image support)
        const userBadge = document.getElementById('user-badge-area');
        if (userBadge) {
            const avatarInner = me.profileImage 
                ? `<div class="avatar me" style="padding:0;overflow:hidden;"><img src="${me.profileImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>`
                : `<div class="avatar me">${me.initials}</div>`;
            userBadge.innerHTML = `
                ${avatarInner}
                <span class="user-name-text" style="font-size:0.85rem;font-weight:500;">${me.name.split(' ')[0]}</span>
            `;
        }

        // Set greeting
        const greet = document.getElementById('feed-greeting');
        if (greet) greet.textContent = me.name ? me.name.split(' ')[0] : 'Player';

        // Start real-time notifications
        Notifications.startListener(me.id);

        // Update stat cards
        const gameData = await DB.getGameData(me.id);
        const el = (id) => document.getElementById(id);
        if (el('stat-completed')) el('stat-completed').textContent = gameData.totalCompleted || 0;
        if (el('stat-created')) el('stat-created').textContent = gameData.totalCreated || 0;
        
        const friends = await DB.getFriends(me.id);
        if (el('stat-friends')) el('stat-friends').textContent = friends.length;

        // Check notification dots
        const requests = await DB.getRequests(me.id);
        hideDotIfEmpty('friend-dot', requests.length);
        hideDotIfEmpty('mob-friend-dot', requests.length);

        const proofs = await DB.getProofs();
        const challenges = await DB.getChallenges();
        const pendingProofs = proofs.filter(p => {
            const chal = challenges.find(c => c.id === p.chalId);
            return chal && chal.creator === me.id && p.approved === null && p.fromId !== me.id;
        });
        hideDotIfEmpty('proof-dot', pendingProofs.length);
        hideDotIfEmpty('mob-proof-dot', pendingProofs.length);

        initModals();
        await showPage('feed');
    });
}
