/* ============================================
   DAREVERSE — Feed Page (Firebase)
   ============================================ */

async function renderFeed(tab) {
    const me = Auth.me();
    const list = document.getElementById('feed-list');

    list.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}<div style="margin-top:0.5rem;color:var(--muted);">Loading feed...</div></div>`;

    let challenges = [], allUsers = [], proofs = [], friendIds = [];
    try {
        challenges = await DB.getChallenges();
        allUsers = await DB.getUsers();
        proofs = await DB.getProofs();
        friendIds = await DB.getFriends(me.id);
    } catch (err) {
        console.error('Feed load error:', err);
        if (err && err.code === 'permission-denied') {
            list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted);">
                ${icon('xCircle', 32)}
                <div style="margin-top:0.75rem;font-weight:600;">Access Denied</div>
                <div style="font-size:0.85rem;margin-top:0.3rem;">Please sign out and sign in again. If the issue persists, contact support.</div>
                <button class="btn btn-primary" style="margin-top:1rem;" onclick="Auth.logout()">Sign Out &amp; Try Again</button>
            </div>`;
        } else {
            list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted);">${icon('alertCircle', 32)}<div style="margin-top:0.5rem;">Error loading feed. Please refresh.</div></div>`;
        }
        return;
    }

    const userMap = {};
    allUsers.forEach(u => userMap[u.id] = u);

    let items = [];

    if (tab === 'all') {
        items = challenges.filter(c => {
            if (c.creator === me.id) return true;
            if ((c.targets || []).includes(me.id)) return true;
            if (c.isPublic || c.visibility === 'public') return true;
            if (friendIds.includes(c.creator)) return true;
            return false;
        }).slice(0, 40);
    } else if (tab === 'public') {
        items = challenges.filter(c => c.isPublic || c.visibility === 'public');
    } else if (tab === 'sent') {
        items = challenges.filter(c => c.creator !== me.id && (c.targets || []).includes(me.id));
    } else {
        items = challenges.filter(c => c.creator === me.id);
    }

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
    const targets = c.targets || [];
    const status = c.status || {};
    const myStatus = status[me.id] || null;
    const completedCount = Object.values(status).filter(s => s === 'completed' || s === 'approved').length;
    const acceptedCount = Object.values(status).filter(s => s === 'pending' || s === 'accepted' || s === 'completed' || s === 'approved').length;
    const total = targets.length;
    const catIcon = getCategoryIcon(c.category);
    const isExpired = myStatus === 'expired';
    const isPublic = c.isPublic || c.visibility === 'public';
    const amITarget = targets.includes(me.id);

    let actionBtn = '';

    if (!isMyChallenge && amITarget) {
      if (myStatus === 'pending') {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="confirmIDare('${c.id}')">${icon('zap', 14)} I Dare</button>`;
      } else if (myStatus === 'accepted') {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="openSubmitProof('${c.id}')">${icon('upload', 14)} Submit Proof</button>`;
        } else if (myStatus === 'completed' || myStatus === 'approved') {
            actionBtn = `<button class="btn btn-success btn-sm" onclick="viewMyProof('${c.id}')">${icon('eye', 14)} View Proof</button>`;
        } else if (isExpired) {
            actionBtn = `<span class="badge badge-red">${icon('xCircle', 11)} Expired</span>`;
        }
    } else if (!isMyChallenge && isPublic && !amITarget) {
        // Public challenge — anyone can accept
      actionBtn = `<button class="btn btn-primary btn-sm" onclick="acceptPublicChallenge('${c.id}')">${icon('zap', 14)} I Dare</button>`;
    } else if (isMyChallenge) {
        const newProofs = (proofs || []).filter(p => p.chalId === c.id && p.approved === null && p.fromId !== me.id);
        if (newProofs.length) {
            actionBtn = `<button class="btn btn-warn btn-sm" onclick="showPage('proofs')">${icon('inbox', 14)} ${newProofs.length} New</button>`;
        }
    }

    const pct = total > 0 ? Math.round(completedCount / total * 100) : 0;
    const targetUsers = targets.map(id => userMap[id]).filter(Boolean);
    const deleteBtn = isMyChallenge
        ? `<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();confirmDelete('${c.id}')" title="Delete challenge">${icon('x', 12)}</button>`
        : '';

    // WhatsApp share button
    const shareBtn = `<button class="btn-whatsapp" onclick="event.stopPropagation();handleWhatsAppShare('${c.id}','${escStr(c.name)}','${escStr(c.desc)}')" title="Share on WhatsApp">${icon('whatsapp', 16)}</button>`;

    return `
  <div class="challenge-card${isExpired ? ' expired' : ''}">
    <div class="card-header">
      <div class="challenge-icon">${catIcon}</div>
      <div style="flex:1;min-width:0;">
        <div class="challenge-title">${c.name || 'Untitled'}</div>
        <div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;flex-wrap:wrap;">
          <span style="font-size:0.75rem;color:var(--muted);">by <strong style="color:var(--text);">${creator ? (isMyChallenge ? 'You' : creator.name) : 'Unknown'}</strong></span>
          ${getVisibilityBadge(c.visibility || 'friends')}
          ${getHonorBadge(c.isHonor)}
          ${getProofTypeBadge(c.proofType)}
          ${getDifficultyBadge(c.difficulty)}
          ${getDeadlineHTML(c)}
        </div>
      </div>
      <div class="card-actions">
        ${actionBtn}
        ${shareBtn}
        ${deleteBtn}
      </div>
    </div>
    <div class="card-body">
      <div class="challenge-desc">${c.desc || ''}</div>
      ${isPublic ? `
      <div style="margin-top:0.6rem;display:flex;gap:0.75rem;flex-wrap:wrap;">
        <span style="font-size:0.75rem;color:var(--muted);">${icon('users', 13)} <strong style="color:var(--text);">${acceptedCount}</strong> accepted</span>
        <span style="font-size:0.75rem;color:var(--muted);">${icon('checkCircle', 13)} <strong style="color:var(--green);">${completedCount}</strong> completed</span>
      </div>` : `
      <div style="margin-top:0.75rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;">
          <span style="font-size:0.75rem;color:var(--muted);">Progress</span>
          <span style="font-size:0.75rem;color:var(--text);font-weight:600;">${completedCount}/${total} completed</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`}
    </div>
    <div class="card-footer">
      <div style="display:flex;gap:0.3rem;flex-wrap:wrap;align-items:center;">
        ${isPublic
            ? `<span style="font-size:0.75rem;color:var(--purple);font-weight:500;">${icon('globe', 13)} Public Challenge</span>`
            : targetUsers.slice(0, 4).map(t => avatarHTML(t, t.id === me.id, 'sm')).join('') +
              (targetUsers.length > 4 ? `<div class="avatar sm" style="background:var(--bg4);color:var(--muted);">+${targetUsers.length - 4}</div>` : '')
        }
      </div>
      <span style="font-size:0.75rem;color:var(--muted);">${formatDate(c.date)}</span>
    </div>
  </div>`;
}

// Escape strings for HTML attribute injection
function escStr(s) {
    return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').slice(0, 80);
}

async function handleWhatsAppShare(chalId, chalName, chalDesc) {
    const me = Auth.me();
  shareToWhatsApp(chalName, chalDesc, me?.name);
    // Award sharing gamification
    await Gamification.awardShare(me.id);
}

// Confirm "I Dare" flow for public challenges
async function confirmIDare(chalId) {
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === chalId);
    if (!chal) return;
    const isPublic = chal.isPublic || chal.visibility === 'public';

    const content = document.getElementById('view-proof-content');
    content.innerHTML = `
    <div style="text-align:center;padding:1.5rem 0;">
      <div style="display:flex;justify-content:center;margin-bottom:0.75rem;">${icon('zap', 36)}</div>
      <div style="font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;">Ready to accept this challenge?</div>
      <div style="color:var(--muted);font-size:0.875rem;margin-bottom:1rem;">${chal.name}</div>
      <div style="background:rgba(255,60,111,0.08);border:1px solid rgba(255,60,111,0.2);border-radius:10px;padding:0.75rem;font-size:0.8rem;color:var(--muted);">
        ${isPublic ? 'Accepting will mark this public challenge as yours and unlock the Submit Proof button.' : 'Accepting will mark this challenge as yours and unlock the Submit Proof button.'}
      </div>
    </div>`;

    const footer = document.querySelector('#viewProofModal .modal-footer');
    footer.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('viewProofModal')">Not Yet</button>
    <button class="btn btn-primary" onclick="acceptChallenge('${chalId}')">${icon('zap', 14)} Accept Challenge</button>`;

    const title = document.querySelector('#viewProofModal .modal-title');
    title.innerHTML = `${icon('zap', 24)} I Dare`;
    openModal('viewProofModal');
}

async function acceptChallenge(chalId) {
    const me = Auth.me();
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === chalId);
    if (!chal) return;

    if (!Array.isArray(chal.targets)) chal.targets = [];
    if (!chal.status) chal.status = {};

    if (!chal.targets.includes(me.id)) {
        chal.targets.push(me.id);
    }
    chal.status[me.id] = 'accepted';

    await DB.updateChallenge(chalId, {
        targets: chal.targets,
        status: chal.status
    });

    await Notifications.send(chal.creator, 'challenge_accepted', { challengeName: chal.name });

    closeModal('viewProofModal');
    toast('Challenge accepted. Tap Submit Proof when you are ready.', 'success');
    renderPage(currentPage);
}

// Accept a public challenge you're not tagged in
async function acceptPublicChallenge(chalId) {
    const me = Auth.me();
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === chalId);
    if (!chal) return;

    if (!Array.isArray(chal.targets)) chal.targets = [];
    if (!chal.status) chal.status = {};

    // Add me to targets and mark the challenge as accepted
    if (!chal.targets.includes(me.id)) {
      chal.targets.push(me.id);
    }
    chal.status[me.id] = 'accepted';
    await DB.updateChallenge(chalId, {
        targets: chal.targets,
        status: chal.status
    });

    // Notify creator
    await Notifications.send(chal.creator, 'challenge_accepted', { challengeName: chal.name });

    toast('You accepted this public challenge. Submit Proof is now available.', 'success');
    renderPage(currentPage);
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
