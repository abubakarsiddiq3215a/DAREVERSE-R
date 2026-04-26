/* ============================================
   DAREVERSE — Feed Page (Firebase)
   ============================================ */

async function renderFeed(tab) {
    const me = Auth.me();
    const list = document.getElementById('feed-list');
    
    // Show loading state
    list.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}<div style="margin-top:0.5rem;color:var(--muted);">Loading feed...</div></div>`;

    const challenges = await DB.getChallenges();
    let items = [];

    if (tab === 'all') {
        items = challenges.slice(0, 15);
    } else if (tab === 'sent') {
        items = challenges.filter(c => c.creator !== me.id && c.targets.includes(me.id));
    } else {
        items = challenges.filter(c => c.creator === me.id);
    }

    // Since challengeCardHTML is also sync but uses DB.getUserById (async now), 
    // we need to pre-fetch users or update challengeCardHTML to be async.
    // Let's pre-fetch all users involved for speed.
    const userIds = new Set();
    items.forEach(c => {
        userIds.add(c.creator);
        c.targets.forEach(t => userIds.add(t));
    });
    
    // We'll use the cached users from DB.getUsers() or fetch fresh
    const allUsers = await DB.getUsers();
    const userMap = {};
    allUsers.forEach(u => userMap[u.id] = u);

    const proofs = await DB.getProofs();

    list.innerHTML = items.length 
        ? items.map(c => challengeCardHTML(c, userMap, proofs)).join('') 
        : emptyState('No challenges here yet');
}

function switchFeedTab(tab, btn) {
    document.querySelectorAll('#page-feed .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderFeed(tab);
}

function challengeCardHTML(c, userMap, proofs) {
    const me = Auth.me();
    const creator = userMap[c.creator];
    const isMyChallenge = c.creator === me.id;
    const myStatus = c.status[me.id];
    const targets = c.targets.map(t => userMap[t]).filter(Boolean);
    const completedCount = Object.values(c.status).filter(s => s === 'completed').length;
    const total = c.targets.length;
    const catIcon = getCategoryIcon(c.category);
    const isExpired = myStatus === 'expired';

    let actionBtn = '';
    if (!isMyChallenge && c.targets.includes(me.id)) {
        if (myStatus === 'pending') {
            actionBtn = `<button class="btn btn-primary btn-sm" onclick="openSubmitProof('${c.id}')">${icon('zap', 14)} Submit Proof</button>`;
        } else if (myStatus === 'completed') {
            actionBtn = `<button class="btn btn-success btn-sm" onclick="viewMyProof('${c.id}')">${icon('eye', 14)} View Proof</button>`;
        } else if (isExpired) {
            actionBtn = `<span class="badge badge-red">${icon('xCircle', 11)} Expired</span>`;
        }
    } else if (isMyChallenge) {
        const newProofs = proofs.filter(p => p.chalId === c.id && p.approved === null && p.fromId !== me.id);
        if (newProofs.length) {
            actionBtn = `<button class="btn btn-warn btn-sm" onclick="showPage('proofs')">${icon('inbox', 14)} ${newProofs.length} New</button>`;
        }
    }

    const pct = total > 0 ? Math.round(completedCount / total * 100) : 0;

    const deleteBtn = isMyChallenge ? `<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();confirmDelete('${c.id}')" title="Delete challenge">${icon('x', 12)}</button>` : '';

    return `
  <div class="challenge-card${isExpired ? ' expired' : ''}">
    <div class="card-header">
      <div class="challenge-icon">${catIcon}</div>
      <div style="flex:1;min-width:0;">
        <div class="challenge-title">${c.name}</div>
        <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;flex-wrap:wrap;">
          <span style="font-size:0.75rem;color:var(--muted);">by <strong style="color:var(--text);">${creator ? (isMyChallenge ? 'You' : creator.name) : 'Unknown'}</strong></span>
          ${getProofTypeBadge(c.proofType)}
          ${getDifficultyBadge(c.difficulty)}
          ${getDeadlineHTML(c)}
        </div>
      </div>
      <div style="flex-shrink:0;display:flex;gap:0.4rem;align-items:center;">
        ${actionBtn}
        ${deleteBtn}
      </div>
    </div>
    <div class="card-body">
      <div class="challenge-desc">${c.desc}</div>
      <div style="margin-top:0.75rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;">
          <span style="font-size:0.75rem;color:var(--muted);">Progress</span>
          <span style="font-size:0.75rem;color:var(--text);font-weight:600;">${completedCount}/${total} completed</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
    <div class="card-footer">
      <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
        ${targets.slice(0, 4).map(t => avatarHTML(t, t.id === me.id, 'sm')).join('')}
        ${targets.length > 4 ? `<div class="avatar sm" style="background:var(--bg4);color:var(--muted);">+${targets.length - 4}</div>` : ''}
      </div>
      <span style="font-size:0.75rem;color:var(--muted);">${formatDate(c.date)}</span>
    </div>
  </div>`;
}

async function confirmDelete(chalId) {
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === chalId);
    if (!chal) return;

    const content = document.getElementById('view-proof-content');
    content.innerHTML = `
    <div style="text-align:center;padding:1.5rem 0;">
      <div style="margin-bottom:1rem;">${icon('x', 48)}</div>
      <div style="font-weight:600;font-size:1.1rem;margin-bottom:0.5rem;">Delete "${chal.name}"?</div>
      <div style="color:var(--muted);font-size:0.875rem;">This will permanently remove the challenge and all associated proofs. This action cannot be undone.</div>
    </div>`;

    const footer = document.querySelector('#viewProofModal .modal-footer');
    footer.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('viewProofModal')">Cancel</button>
    <button class="btn btn-danger" onclick="deleteChallenge('${chalId}');closeModal('viewProofModal')">${icon('x', 14)} Delete</button>`;

    const title = document.querySelector('#viewProofModal .modal-title');
    title.innerHTML = `${icon('x', 24)} Confirm Delete`;
    openModal('viewProofModal');
}
