/* ============================================
   DAREVERSE — Friends & Social (Firebase)
   ============================================ */

async function renderFriends(tab) {
    const me = Auth.me();
    const list = document.getElementById('friend-list');
    
    list.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}</div>`;

    const friendIds = await DB.getFriends(me.id);
    const requests = await DB.getRequests(me.id);
    const allUsers = await DB.getUsers();

    if (tab === 'friends') {
        const friends = allUsers.filter(u => friendIds.includes(u.id));
        list.innerHTML = `<div style="margin-top:1rem;">${friends.length ? friends.map(f => friendCardHTML(f, 'friend')).join('') : emptyState('No friends yet. Search and add some!')}</div>`;
    } else if (tab === 'requests') {
        const reqUsers = allUsers.filter(u => requests.find(r => r.fromId === u.id));
        list.innerHTML = `<div style="margin-top:1rem;">${reqUsers.length ? reqUsers.map(u => friendCardHTML(u, 'request')).join('') : emptyState('No pending requests')}</div>`;
    } else if (tab === 'discover') {
        list.innerHTML = `
        <div style="margin-top:1rem;">
            <div class="search-wrap">
                ${icon('search', 18)}
                <input type="text" id="friend-search" placeholder="Search by username or name..." oninput="searchUsers(this.value)">
            </div>
            <div id="search-results"></div>
        </div>`;
    }
}

function switchFriendTab(tab, btn) {
    document.querySelectorAll('#page-friends .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderFriends(tab);
}

function friendCardHTML(u, type) {
    const isFriend = type === 'friend';
    const subText = isFriend ? `@${u.username}` : 'wants to be friends';

    let action = '';
    if (isFriend) {
        action = `<button class="btn btn-primary btn-xs" onclick="challengeFriend('${u.id}')">${icon('zap', 14)} Dare</button>`;
    } else {
        action = `
      <button class="btn btn-success btn-xs" onclick="acceptFriend('${u.id}')">${icon('checkCircle', 14)}</button>
      <button class="btn btn-ghost btn-xs" onclick="rejectFriend('${u.id}')">${icon('x', 14)}</button>`;
    }

    return `
    <div class="friend-card">
      <div class="avatar-wrap">
        ${avatarHTML(u, false)}
        ${isFriend ? '<div class="online-dot"></div>' : ''}
      </div>
      <div class="info">
        <div class="name">${u.name}</div>
        <div class="sub">${subText}</div>
      </div>
      <div class="actions">${action}</div>
    </div>`;
}

async function searchUsers(query) {
    const me = Auth.me();
    const results = document.getElementById('search-results');
    if (!query || query.length < 2) { results.innerHTML = ''; return; }

    const q = query.toLowerCase();
    const allUsers = await DB.getUsers();
    const friendIds = await DB.getFriends(me.id);
    const requests = await DB.getRequests(me.id);

    const matches = allUsers.filter(u =>
        u.id !== me.id &&
        !friendIds.includes(u.id) &&
        (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    );

    results.innerHTML = matches.length ? matches.map(u => {
        // Check if already requested
        const hasRequested = !!requests.find(r => r.fromId === u.id);
        const btn = hasRequested ? 
            `<button class="btn btn-success btn-xs" onclick="acceptFriend('${u.id}')">Accept</button>` :
            `<button class="btn btn-primary btn-xs" onclick="sendFriendRequest('${u.id}')">${icon('userPlus', 14)} Add</button>`;

        return `
      <div class="friend-card">
        ${avatarHTML(u, false, 'sm')}
        <div class="info">
          <div class="name">${u.name}</div>
          <div class="sub">@${u.username}</div>
        </div>
        <div class="actions">${btn}</div>
      </div>`;
    }).join('') : '<div style="padding:1rem;color:var(--muted);font-size:0.875rem;">No users found</div>';
}

async function sendFriendRequest(toId) {
    const me = Auth.me();
    await DB.sendRequest(me.id, toId);
    await Notifications.send(toId, 'friend_request');
    toast('Friend request sent!', 'success');
    document.getElementById('friend-search').value = '';
    document.getElementById('search-results').innerHTML = '';
}

async function acceptFriend(fromId) {
    const me = Auth.me();
    await DB.acceptRequest(me.id, fromId);
    await Notifications.send(fromId, 'friend_accepted');
    toast('Friend request accepted!', 'success');
    renderFriends('requests');
}

async function rejectFriend(fromId) {
    const me = Auth.me();
    await db.collection('social').doc(me.id).collection('requests').doc(fromId).delete();
    toast('Request removed');
    renderFriends('requests');
}
