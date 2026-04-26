/* ============================================
   DAREVERSE — Leaderboard (Firebase)
   ============================================ */

async function renderLeaderboard(tab) {
    const me = Auth.me();
    const list = document.getElementById('lb-list');
    
    list.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}</div>`;

    const friendIds = await DB.getFriends(me.id);
    const allUsers = await DB.getUsers();
    
    // Build player list with gamification data
    let players = [];
    
    for (const u of allUsers) {
        const isMe = u.id === me.id;
        if (tab === 'friends' && !isMe && !friendIds.includes(u.id)) continue;
        
        const gd = await DB.getGameData(u.id);
        players.push({
            id: u.id, name: u.name, initials: u.initials,
            rankPoints: gd.rankPoints,
            totalCompleted: gd.totalCompleted,
            currentStreak: gd.currentStreak,
            isMe: isMe
        });
    }

    // Sort by rank points
    players.sort((a, b) => b.rankPoints - a.rankPoints);

    if (!players.length) {
        list.innerHTML = emptyState('No players yet');
        return;
    }

    const maxPts = players[0]?.rankPoints || 1;
    const rankColors = ['var(--gold)', 'var(--silver)', 'var(--bronze)'];

    list.innerHTML = `<div style="margin-top:1rem;">` + players.map((p, i) => {
        const rank = Gamification.getRank(p.rankPoints);
        const pct = Math.round(p.rankPoints / maxPts * 100);
        const medalSvg = i < 3 ? icon('award', 20) : '';

        return `
    <div class="lb-row ${p.isMe ? 'is-me' : ''}">
      <div class="lb-rank" style="color:${rankColors[i] || 'var(--muted)'};">${i < 3 ? medalSvg : (i + 1)}</div>
      <div class="avatar-wrap">
        ${avatarHTML(p, p.isMe)}
      </div>
      <div style="flex:1;min-width:0;">
        <div class="lb-name">${p.name}${p.isMe ? ' <span style="color:var(--accent);font-size:0.72rem;">(you)</span>' : ''}</div>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <span class="rank-badge ${rank.css}">${rank.name}</span>
          ${p.currentStreak > 0 ? `<span style="font-size:0.72rem;color:var(--accent2);display:inline-flex;align-items:center;gap:2px;">${icon('flame', 14)} ${p.currentStreak}d streak</span>` : ''}
        </div>
        <div class="progress-bar" style="width:120px;max-width:100%;margin-top:4px;"><div class="progress-fill" style="width:${pct}%;background:${rankColors[i] || 'var(--accent)'}"></div></div>
      </div>
      <div class="lb-score">${p.rankPoints} pts</div>
    </div>`;
    }).join('') + '</div>';
}

function switchLbTab(tab, btn) {
    document.querySelectorAll('#page-leaderboard .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderLeaderboard(tab);
}
