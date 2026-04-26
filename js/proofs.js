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

    // Creator's private challenge proofs — awaiting manual approval
    const myCreatedPending = allProofs.filter(p => {
        const chal = challenges.find(c => c.id === p.chalId);
        return chal && chal.creator === me.id && p.approved === null
            && p.fromId !== me.id
            && (!chal.isPublic || p.status === 'escalated');
    });

    // Public challenge proofs awaiting community vote (user can vote if not creator & not submitter)
    const publicVotePending = allProofs.filter(p => {
        const chal = challenges.find(c => c.id === p.chalId);
        if (!chal || !chal.isPublic) return false;
        if (p.fromId === me.id) return false;
        if (chal.creator === me.id) return false;
        if (p.approved !== null) return false;
        if (p.status === 'escalated') return false;
        // Check if user already voted
        const votes = p.votes || {};
        return !votes[me.id];
    });

    if (!myCreatedPending.length && !publicVotePending.length) {
        list.innerHTML = emptyState('No proofs to verify');
        return;
    }

    let html = '<div style="margin-top:1rem;">';

    if (myCreatedPending.length) {
        html += `<div style="font-size:0.78rem;color:var(--muted);font-weight:600;letter-spacing:0.5px;margin-bottom:0.75rem;">YOUR CHALLENGES — AWAITING YOUR DECISION</div>`;
        html += '<div class="grid-auto">' + myCreatedPending.map(p => {
            const chal = challenges.find(c => c.id === p.chalId);
            const from = userMap[p.fromId];
            return proofCardHTML(p, chal, from);
        }).join('') + '</div>';
    }

    if (publicVotePending.length) {
        html += `<div style="font-size:0.78rem;color:var(--muted);font-weight:600;letter-spacing:0.5px;margin:1.25rem 0 0.75rem;">COMMUNITY VOTE — PUBLIC CHALLENGES</div>`;
        html += '<div class="grid-auto">' + publicVotePending.map(p => {
            const chal = challenges.find(c => c.id === p.chalId);
            const from = userMap[p.fromId];
            return proofCardHTML(p, chal, from, true);
        }).join('') + '</div>';
    }

    html += '</div>';
    list.innerHTML = html;
}

function proofCardHTML(p, chal, from, isCommunity = false) {
    let thumb = '';
    const src = p.fileData || p.fileUrl;

    if (p.isHonor) {
        // Honor-based: no media
        thumb = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:0.3rem;">${icon('shield', 28)}<span style="font-size:0.65rem;color:var(--muted);">Honor</span></div>`;
    } else if (src && p.fileType === 'video') {
        thumb = `<video src="${src}"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">${icon('video', 24)}</div>`;
    } else if (src) {
        thumb = `<img src="${src}" alt="Proof">`;
    } else {
        thumb = `<div style="display:flex;align-items:center;justify-content:center;height:100%;">${icon('image', 28)}</div>`;
    }

    const voteCount = p.votes ? Object.keys(p.votes).length : 0;
    const validCount = p.votes ? Object.values(p.votes).filter(v => v === 'valid').length : 0;

    return `
    <div class="proof-card" onclick="${isCommunity ? `openCommunityVote('${p.id}')` : `openVerifyProof('${p.id}')`}">
      <div class="proof-thumb" style="position:relative;">${thumb}</div>
      <div class="proof-meta">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:0.2rem;">${chal ? chal.name : 'Unknown Challenge'}</div>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          ${avatarHTML(from, false, 'xs')}
          <span style="font-size:0.75rem;color:var(--muted);">${from ? from.name : 'Unknown'}</span>
        </div>
        ${isCommunity ? `<div style="margin-top:0.4rem;font-size:0.7rem;color:var(--muted);">${icon('thumbsUp', 11)} ${validCount}/${voteCount} votes</div>` : ''}
        ${p.isHonor ? `<div style="margin-top:0.3rem;">${getHonorBadge(true)}</div>` : ''}
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
    <button class="btn btn-danger" onclick="verifyProof('${proof.id}', false)">${icon('x', 14)} Reject</button>
    <button class="btn btn-primary" onclick="verifyProof('${proof.id}', true)">${icon('checkCircle', 14)} Approve & Award Points</button>`;

    openModal('viewProofModal');
}

// Community voting modal for public challenge proofs
async function openCommunityVote(proofId) {
    const proofs = await DB.getProofs();
    const proof = proofs.find(p => p.id === proofId);
    if (!proof) return;

    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === proof.chalId);
    const user = await DB.getUserById(proof.fromId);
    const content = document.getElementById('view-proof-content');

    const src = proof.fileData || proof.fileUrl;
    let mediaHTML = src
        ? (proof.fileType === 'video'
            ? `<video controls style="max-width:100%;max-height:320px;border-radius:8px;"><source src="${src}"></video>`
            : `<img src="${src}" alt="Proof" style="max-width:100%;max-height:320px;border-radius:8px;">`)
        : '';

    const votes = proof.votes || {};
    const voteCount = Object.keys(votes).length;
    const validCount = Object.values(votes).filter(v => v === 'valid').length;
    const validPct = voteCount ? Math.round(validCount / voteCount * 100) : 0;

    content.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;background:var(--bg3);padding:0.75rem;border-radius:10px;">
      ${avatarHTML(user, false, 'sm')}
      <div>
        <div style="font-weight:600;font-size:0.9rem;">${user ? user.name : 'Unknown'}</div>
        <div style="font-size:0.75rem;color:var(--muted);">${chal ? chal.name : ''} · ${formatDate(proof.date)}</div>
      </div>
    </div>
    <div class="proof-viewer">${mediaHTML}</div>
    ${proof.note ? `<div style="padding:1rem;background:var(--bg3);border-radius:10px;font-style:italic;margin-bottom:1rem;">"${proof.note}"</div>` : ''}
    <div style="background:var(--bg3);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;font-size:0.78rem;color:var(--muted);">
        <span>${icon('thumbsUp', 13)} Community Vote</span>
        <span>${validCount} valid / ${voteCount} total ${voteCount >= 5 ? '' : '<span style="color:var(--gold)">(min 5 needed)</span>'}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${validPct}%;background:${validPct >= 70 ? 'var(--green)' : validPct < 40 && voteCount >= 5 ? 'var(--accent)' : 'var(--accent2)'}"></div></div>
      <div style="font-size:0.72rem;color:var(--muted);margin-top:0.3rem;">${validPct}% valid · Need 70% to approve</div>
    </div>
    `;

    const footer = document.querySelector('#viewProofModal .modal-footer');
    footer.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('viewProofModal')">Cancel</button>
    <button class="btn btn-danger vote-btn" onclick="voteOnProof('${proof.id}', 'invalid')">${icon('thumbsDown', 14)} Invalid</button>
    <button class="btn btn-success vote-btn" onclick="voteOnProof('${proof.id}', 'valid')">${icon('thumbsUp', 14)} Valid</button>`;

    const title = document.querySelector('#viewProofModal .modal-title');
    title.innerHTML = `${icon('users', 24)} Community Proof Vote`;

    openModal('viewProofModal');
}

async function voteOnProof(proofId, voteValue) {
    const me = Auth.me();
    const proofDocRef = db.collection('proofs').doc(proofId);
    const proofDoc = await proofDocRef.get();
    if (!proofDoc.exists) return;
    const proof = proofDoc.data();
    if (!proof) return;

    const votes = proof.votes || {};
    if (votes[me.id]) { toast('You already voted!', 'error'); return; }

    votes[me.id] = voteValue;
    await proofDocRef.update({ votes });

    // Award 1 pt for participating in community voting
    await Gamification.awardVoting(me.id);

    // Check thresholds
    const voteCount = Object.keys(votes).length;
    const validCount = Object.values(votes).filter(v => v === 'valid').length;
    const validPct = validCount / voteCount * 100;

    if (voteCount >= 5) {
        const challenges = await DB.getChallenges();
        const chal = challenges.find(c => c.id === proof.chalId);

        // Re-read to avoid double-finalization from concurrent voters.
        const latestDoc = await proofDocRef.get();
        if (!latestDoc.exists) return;
        const latest = latestDoc.data();
        if (latest.approved !== null) {
            closeModal('viewProofModal');
            await renderPage('proofs');
            return;
        }

        if (validPct >= 70) {
            // Auto-approve
            await proofDocRef.update({ approved: true, status: 'resolved' });
            if (chal) {
                const updatedStatus = Object.assign({}, chal.status || {}, { [proof.fromId]: 'approved' });
                await db.collection('challenges').doc(chal.id).update({ status: updatedStatus });
                const pts = chal.difficulty === 'hard' ? 50 : chal.difficulty === 'medium' ? 25 : 10;
                await Gamification.awardCompletion(proof.fromId, chal.difficulty, chal.category, chal.id);
                await Notifications.send(proof.fromId, 'proof_approved', { points: pts, challengeName: chal.name });
            }
            toast('Voted. Community approved this proof.', 'success');
        } else if (validPct < 40) {
            // Auto-reject
            await proofDocRef.update({ approved: false, status: 'resolved' });
            if (chal) {
                const updatedStatus = Object.assign({}, chal.status || {}, { [proof.fromId]: 'rejected' });
                await db.collection('challenges').doc(chal.id).update({ status: updatedStatus });
            }
            await Notifications.send(proof.fromId, 'proof_rejected', {});
            toast('Voted. Community rejected this proof.', 'info');
        } else {
            // Escalate to challenge creator for final decision.
            await proofDocRef.update({ status: 'escalated' });
            toast('Voted. Escalated to challenge creator for review.', 'info');
        }
    } else {
        toast('Vote recorded! +1 pt', 'success');
    }

    closeModal('viewProofModal');
    renderPage('proofs');
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
            const updatedStatus = Object.assign({}, chal.status || {}, { [proof.fromId]: 'approved' });
            await db.collection('challenges').doc(chal.id).update({ status: updatedStatus });
            const pts = chal.difficulty === 'hard' ? 50 : chal.difficulty === 'medium' ? 25 : 10;
            await Gamification.awardCompletion(proof.fromId, chal.difficulty, chal.category, chal.id);
            await Notifications.send(proof.fromId, 'proof_approved', { points: pts, challengeName: chal.name });
        } else {
            await Notifications.send(proof.fromId, 'proof_approved', { points: 10, challengeName: 'Challenge' });
        }
        toast('Proof approved!', 'success');
    } else {
        const challenges = await DB.getChallenges();
        const chal = challenges.find(c => c.id === proof.chalId);
        if (chal) {
            const updatedStatus = Object.assign({}, chal.status || {}, { [proof.fromId]: 'rejected' });
            await db.collection('challenges').doc(chal.id).update({ status: updatedStatus });
        }
        await Notifications.send(proof.fromId, 'proof_rejected', {});
        toast('Proof rejected');
    }

    closeModal('viewProofModal');
    renderPage('proofs');
}
