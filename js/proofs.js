/* ============================================
   DAREVERSE — Proof Verification (Firebase)
   ============================================ */

async function renderProofs() {
    const me = Auth.me();
    const list = document.getElementById('proof-list');
    
    list.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}</div>`;

    const allProofs = await DB.getProofs();
    const challenges = await DB.getChallenges();
    const allUsers = await DB.getUsers();
    const userMap = {};
    allUsers.forEach(u => userMap[u.id] = u);

    const pending = allProofs.filter(p => {
        const chal = challenges.find(c => c.id === p.chalId);
        return chal && chal.creator === me.id && p.approved === null && p.fromId !== me.id;
    });

    if (!pending.length) {
        list.innerHTML = emptyState('No proofs to verify');
        return;
    }

    list.innerHTML = `
    <div class="grid-auto" style="margin-top:1rem;">
      ${pending.map(p => {
        const chal = challenges.find(c => c.id === p.chalId);
        const from = userMap[p.fromId];
        return proofCardHTML(p, chal, from);
    }).join('')}
    </div>`;
}

function proofCardHTML(p, chal, from) {
    let thumb = '';
    const src = p.fileData || p.fileUrl; // Support both for backward compatibility
    if (p.fileType === 'video') {
        thumb = `<video src="${src}"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">${icon('video', 24)}</div>`;
    } else {
        thumb = `<img src="${src}" alt="Proof">`;
    }

    return `
    <div class="proof-card" onclick="openVerifyProof('${p.id}')">
      <div class="proof-thumb" style="position:relative;">${thumb}</div>
      <div class="proof-meta">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:0.2rem;">${chal ? chal.name : 'Unknown Challenge'}</div>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          ${avatarHTML(from, false, 'xs')}
          <span style="font-size:0.75rem;color:var(--muted);">${from ? from.name : 'Unknown'}</span>
        </div>
      </div>
    </div>`;
}

async function openVerifyProof(proofId) {
    const proofs = await DB.getProofs();
    const proof = proofs.find(p => p.id === proofId);
    if (!proof) return;

    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === proof.chalId);
    const user = await DB.getUserById(proof.fromId);
    const content = document.getElementById('view-proof-content');

    const src = proof.fileData || proof.fileUrl;
    let mediaHTML = '';
    if (proof.fileType === 'video') {
        mediaHTML = `<video controls style="max-width:100%;max-height:350px;border-radius:8px;"><source src="${src}"></video>`;
    } else {
        mediaHTML = `<img src="${src}" alt="Proof" style="max-width:100%;max-height:350px;border-radius:8px;">`;
    }

    content.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem;background:var(--bg3);padding:0.75rem;border-radius:10px;">
      ${avatarHTML(user, false, 'sm')}
      <div>
        <div style="font-weight:600;font-size:0.9rem;">${user ? user.name : 'Unknown'}</div>
        <div style="font-size:0.75rem;color:var(--muted);">Submitted ${formatDate(proof.date)}</div>
      </div>
    </div>
    <div class="proof-viewer">${mediaHTML}</div>
    ${proof.note ? `<div style="padding:1rem;background:var(--bg3);border-radius:10px;font-style:italic;margin-bottom:1rem;">"${proof.note}"</div>` : ''}
    `;

    const footer = document.querySelector('#viewProofModal .modal-footer');
    footer.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('viewProofModal')">Cancel</button>
    <button class="btn btn-danger" onclick="verifyProof('${proof.id}', false)">Reject</button>
    <button class="btn btn-primary" onclick="verifyProof('${proof.id}', true)">${icon('checkCircle', 14)} Approve & Award Points</button>`;

    openModal('viewProofModal');
}

async function verifyProof(proofId, approved) {
    const proofs = await DB.getProofs();
    const proof = proofs.find(p => p.id === proofId);
    if (!proof) return;

    await db.collection('proofs').doc(proofId).update({ approved });

    if (approved) {
        const me = Auth.me();
        await Gamification.awardVerification(me.id);
        const challenges = await DB.getChallenges();
        const chal = challenges.find(c => c.id === proof.chalId);
        if (chal) {
            chal.status[proof.fromId] = 'approved';
            await db.collection('challenges').doc(chal.id).update({ status: chal.status });
        }
        const pts = chal ? (chal.difficulty === 'hard' ? 50 : chal.difficulty === 'medium' ? 25 : 10) : 10;
        await Notifications.send(proof.fromId, 'proof_approved', { points: pts, challengeName: chal ? chal.name : '' });
        toast('Proof approved!', 'success');
    } else {
        await Notifications.send(proof.fromId, 'proof_rejected', {});
        toast('Proof rejected');
    }

    closeModal('viewProofModal');
    renderPage('proofs');
}
