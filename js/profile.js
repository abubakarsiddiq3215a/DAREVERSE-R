/* ============================================
   DAREVERSE — Profile Page (Firebase)
   ============================================ */

async function renderProfile() {
    const me = Auth.me();
    if (!me) return;
    
    const container = document.getElementById('profile-content');
    container.innerHTML = `<div style="text-align:center;padding:5rem;">${icon('clock', 32)}</div>`;

    const gameData = await DB.getGameData(me.id);
    const friendIds = await DB.getFriends(me.id);
    const rank = Gamification.getRank(gameData.rankPoints);
    const nextRank = Gamification.getNextRank(gameData.rankPoints);
    const progress = Gamification.getProgressToNextRank(gameData.rankPoints);
    
    const joinDate = me.joinDate ? new Date(me.joinDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2024';

    // All badge definitions
    const allBadges = Object.entries(Gamification.BADGES).map(([name, badge]) => {
        const earned = gameData.badges && gameData.badges.includes(name);
        return { name, ...badge, earned };
    });

    container.innerHTML = `
    <!-- Profile Header -->
    <div class="card profile-header-card">
      <div class="avatar lg me profile-avatar">${me.initials}</div>
      <div class="profile-info">
        <div class="profile-name">${me.name}</div>
        <div class="profile-sub">@${me.username} · Joined ${joinDate}</div>
        <div class="profile-badges">
          ${Gamification.getRankBadge(gameData.rankPoints)}
          <span class="badge badge-blue">${icon('zap', 12)} ${gameData.rankPoints} pts</span>
          ${gameData.currentStreak > 0 ? `<span class="badge badge-red">${icon('flame', 12)} ${gameData.currentStreak}d streak</span>` : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="Auth.logout()" style="flex-shrink:0;">${icon('logout', 16)} Logout</button>
    </div>

    <!-- Rank Progress -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="card-section-title">${icon('trendUp', 18)} Rank Progress</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
        <span class="rank-badge ${rank.css}">${rank.name}</span>
        ${nextRank ? `<span style="font-size:0.78rem;color:var(--muted);">${gameData.rankPoints} / ${nextRank.min} pts</span>` : `<span style="font-size:0.78rem;color:var(--gold);">MAX RANK!</span>`}
      </div>
      <div class="progress-bar" style="height:8px;">
        <div class="progress-fill" style="width:${progress}%;"></div>
      </div>
      ${nextRank ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:0.4rem;">Next: <strong style="color:var(--text);">${nextRank.name}</strong> at ${nextRank.min} pts (${nextRank.min - gameData.rankPoints} pts to go)</div>` : ''}
    </div>

    <!-- Stats -->
    <div class="grid-3 stat-row-mobile" style="margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-val">${gameData.totalCompleted}</div><div class="stat-label">COMPLETED</div></div>
      <div class="stat-card"><div class="stat-val">${gameData.totalCreated}</div><div class="stat-label">CREATED</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--neon);">${friendIds.length}</div><div class="stat-label">FRIENDS</div></div>
    </div>

    <!-- Streak Info -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="card-section-title">${icon('flame', 18)} Streak Stats</div>
      <div class="grid-2">
        <div class="streak-box">
          <div class="streak-val" style="color:var(--accent2);">${gameData.currentStreak}</div>
          <div class="streak-label">CURRENT STREAK</div>
        </div>
        <div class="streak-box">
          <div class="streak-val" style="color:var(--gold);">${gameData.longestStreak}</div>
          <div class="streak-label">BEST STREAK</div>
        </div>
      </div>
    </div>

    <!-- Badges -->
    <div class="card">
      <div class="card-section-title">${icon('award', 18)} Badges (${allBadges.filter(b => b.earned).length}/${allBadges.length})</div>
      <div class="badges-grid">
        ${allBadges.map(b => `
          <div class="badge-card ${b.earned ? '' : 'locked'}" title="${b.desc}">
            <div class="badge-icon">${b.earned ? icon(b.icon, 28) : icon('lock', 28)}</div>
            <div class="badge-label">${b.earned ? b.name : 'Locked'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
