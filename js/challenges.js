/* ============================================
   DAREVERSE — Challenges Page + Proof Submission (Firebase)
   ============================================ */

let taggedUsers = [];
let currentChalForProof = null;

async function renderChallenges(tab) {
    const me = Auth.me();
    const list = document.getElementById('chal-list');

    list.innerHTML = `<div style="text-align:center;padding:2rem;">${icon('clock', 32)}</div>`;

    const challenges = await DB.getChallenges();
    const allUsers = await DB.getUsers();
    const userMap = {};
    allUsers.forEach(u => userMap[u.id] = u);
    const proofs = await DB.getProofs();

    let items;
    if (tab === 'created') {
        items = challenges.filter(c => c.creator === me.id);
    } else if (tab === 'pending') {
        items = challenges.filter(c => c.targets.includes(me.id) && c.status[me.id] === 'pending');
    } else {
        items = challenges.filter(c => c.targets.includes(me.id) && (c.status[me.id] === 'completed' || c.status[me.id] === 'approved'));
    }

    list.innerHTML = `<div style="margin-top:1rem;">${items.length ? items.map(c => challengeCardHTML(c, userMap, proofs)).join('') : emptyState('Nothing here')}</div>`;
}

function switchChalTab(tab, btn) {
    document.querySelectorAll('#page-challenges .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderChallenges(tab);
}

// Tag input for create challenge
async function tagInput(val) {
    const me = Auth.me();
    const sugg = document.getElementById('tag-sugg');
    if (!val.includes('@')) { sugg.classList.remove('open'); return; }
    const query = val.split('@').pop().toLowerCase();

    const friendIds = await DB.getFriends(me.id);
    const allUsers = await DB.getUsers();
    const friends = allUsers.filter(u => friendIds.includes(u.id));

    const matches = friends.filter(f =>
        !taggedUsers.find(t => t.id === f.id) &&
        (f.name.toLowerCase().includes(query) || f.username.toLowerCase().includes(query))
    );

    if (!matches.length) { sugg.classList.remove('open'); return; }
    sugg.innerHTML = matches.map(f => `
    <div class="tag-sug-item" onclick="addTag('@${f.username}','${f.id}')">
      ${avatarHTML(f, false, 'sm')}
      <span>${f.name}</span>
    </div>`).join('');
    sugg.classList.add('open');
}

async function addTag(label, id) {
    if (taggedUsers.find(t => t.id === id)) return;
    const user = await DB.getUserById(id);
    if (!user) return;
    taggedUsers.push({ id, label });
    const chips = document.getElementById('tag-chips');
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.dataset.id = id;
    chip.innerHTML = `${label} <button onclick="removeTag('${id}')">×</button>`;
    chips.appendChild(chip);
    document.getElementById('tag-raw').value = '';
    document.getElementById('tag-sugg').classList.remove('open');
}

function removeTag(id) {
    taggedUsers = taggedUsers.filter(t => t.id !== id);
    const chip = document.querySelector(`[data-id="${id}"]`);
    if (chip) chip.remove();
}

function tagKeyDown(e) {
    if (e.key === 'Backspace' && !e.target.value && taggedUsers.length) {
        removeTag(taggedUsers[taggedUsers.length - 1].id);
    }
}

function challengeFriend(id) {
    openModal('createChallengeModal');
    // Look up user after a brief delay to ensure modal is open
    DB.getUserById(id).then(user => {
        if (user) addTag(`@${user.username}`, id);
    });
}

// Add all friends at once
async function tagAllFriends() {
    const me = Auth.me();
    const friendIds = await DB.getFriends(me.id);
    const allUsers = await DB.getUsers();
    const friends = allUsers.filter(u => friendIds.includes(u.id));

    for (const f of friends) {
        if (!taggedUsers.find(t => t.id === f.id)) {
            await addTag(`@${f.username}`, f.id);
        }
    }
    toast(`Tagged ${friends.length} friend${friends.length !== 1 ? 's' : ''}!`, 'success');
}

async function createChallenge() {
    const me = Auth.me();
    const name = document.getElementById('chal-name').value.trim();
    const desc = document.getElementById('chal-desc').value.trim();
    const proofType = document.getElementById('chal-proof').value;
    const category = document.getElementById('chal-cat').value;
    const difficulty = document.getElementById('chal-diff').value;
    const deadline = document.getElementById('chal-deadline').value || null;
    const visibilityEl = document.getElementById('chal-visibility');
    const honorEl = document.getElementById('chal-honor');

    const isPublic = visibilityEl ? visibilityEl.value === 'public' : false;
    const isHonor = honorEl ? honorEl.checked : false;

    if (!name) { toast('Please enter a challenge name'); return; }
    if (!desc) { toast('Please describe how to complete it'); return; }

    // For public challenges, tagging friends is optional (it broadcasts to all)
    // For private challenges, tagging is required
    if (!isPublic && !taggedUsers.length) {
        toast('Tag at least one friend, or set visibility to Public');
        return;
    }

    let targets = taggedUsers.map(t => t.id);

    // If public, still include tagged friends
    const status = {};
    targets.forEach(id => status[id] = 'pending');

    const chalId = 'c' + Date.now();
    const newChal = {
        id: chalId,
        name, desc, category, proofType, difficulty,
        creator: me.id,
        targets, status,
        deadline,
        isPublic,
        isHonor,
        visibility: isPublic ? 'public' : 'friends',
        date: new Date().toISOString().split('T')[0]
    };

    await DB.addChallenge(newChal);
    await Gamification.awardCreation(me.id);

    // Send notifications to tagged users
    for (const targetId of targets) {
        await Notifications.send(targetId, 'challenge_sent', { challengeName: name });
    }

    // Reset form
    document.getElementById('chal-name').value = '';
    document.getElementById('chal-desc').value = '';
    document.getElementById('chal-deadline').value = '';
    document.getElementById('tag-chips').innerHTML = '';
    taggedUsers = [];
    if (honorEl) honorEl.checked = false;

    const gameData = await DB.getGameData(me.id);
    const el = document.getElementById('stat-created');
    if (el) el.textContent = gameData.totalCreated;

    closeModal('createChallengeModal');
    toast(`Challenge ${isPublic ? 'posted publicly' : 'sent'}!`, 'success');
    showPage('feed');
}

async function deleteChallenge(chalId) {
    await db.collection('challenges').doc(chalId).delete();
    const proofsSnapshot = await db.collection('proofs').where('chalId', '==', chalId).get();
    for (const doc of proofsSnapshot.docs) await doc.ref.delete();
    toast('Challenge deleted', 'success');
    renderPage(currentPage);
}

// ==========================================
// Deadline helpers
// ==========================================
function getDeadlineHTML(chal) {
    if (!chal.deadline) return '';
    const today = new Date();
    const dl = new Date(chal.deadline);
    const diff = Math.ceil((dl - today) / 86400000);
    const formatted = dl.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    if (diff < 0) {
        return `<span class="badge badge-red">${icon('clock', 11)} Expired ${formatted}</span>`;
    } else if (diff === 0) {
        return `<span class="badge badge-red">${icon('clock', 11)} Due TODAY</span>`;
    } else if (diff <= 3) {
        return `<span class="badge badge-gold">${icon('clock', 11)} ${diff}d left</span>`;
    }
    return `<span class="badge badge-blue">${icon('clock', 11)} Due ${formatted}</span>`;
}

function checkDeadlines() {
    // No-op for Firebase — deadlines are checked on render
}

// ==========================================
// File selection handler
// ==========================================
function fileSelected(input) {
    if (input.files[0]) {
        if (input.files[0].size > 10 * 1024 * 1024) {
            toast('File too large! Max 10MB.', 'error');
            input.value = '';
            return;
        }
        const sizeMB = (input.files[0].size / (1024 * 1024)).toFixed(1);
        document.getElementById('proof-upload-icon').innerHTML = icon('checkCircle', 32);
        document.getElementById('proof-upload-text').textContent = `${input.files[0].name} (${sizeMB}MB)`;
        document.getElementById('proof-upload-area').classList.add('has-file');
    }
}

// Submit proof
async function openSubmitProof(chalId) {
    currentChalForProof = chalId;
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === chalId);
    if (!chal) return;

    const isHonor = chal.isHonor || false;

    document.getElementById('proof-chal-info').innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:1rem;">
      <div style="font-weight:600;margin-bottom:0.25rem;">${getCategoryIcon(chal.category)} ${chal.name}</div>
      <div style="font-size:0.8rem;color:var(--muted);">${chal.desc}</div>
            ${isHonor ? `<div style="margin-top:0.5rem;">${getHonorBadge(true)} <span style="font-size:0.75rem;color:var(--gold);">Honor-based - auto-approved, +5 pts</span></div>` : ''}
            ${chal.isPublic ? `<div style="margin-top:0.3rem;">${getVisibilityBadge('public')} <span style="font-size:0.75rem;color:var(--purple);">Public - community will vote on your proof</span></div>` : ''}
    </div>`;

    // For honor-based, no file upload needed
    if (isHonor) {
        document.getElementById('proof-upload-area').style.display = 'none';
        document.querySelector('#submitProofModal label').textContent = 'Honor Declaration';
    } else {
        document.getElementById('proof-upload-area').style.display = '';
        const uploadIcon = document.getElementById('proof-upload-icon');
        uploadIcon.innerHTML = icon(chal.proofType === 'video' ? 'video' : 'camera', 32);
        document.getElementById('proof-upload-text').textContent = 'Click to upload proof (max 10MB)';
        document.getElementById('proof-upload-area').classList.remove('has-file');
        document.getElementById('proof-file').value = '';
    }

    document.getElementById('proof-note').value = '';
    openModal('submitProofModal');
}

async function submitProof() {
    const me = Auth.me();
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === currentChalForProof);
    if (!chal) return;

    const isHonor = chal.isHonor || false;
    const note = document.getElementById('proof-note').value || 'Completed!';

    // Honor-based: auto-approve, no file needed
    if (isHonor) {
        const newProof = {
            id: 'p' + Date.now(),
            chalId: currentChalForProof,
            fromId: me.id,
            fileType: null,
            fileName: null,
            fileUrl: null,
            note,
            date: new Date().toISOString().split('T')[0],
            approved: true,
            isHonor: true,
            votes: {}
        };
        await DB.addProof(newProof);
        // Use targeted update instead of full overwrite
        const updatedStatus = Object.assign({}, chal.status || {}, { [me.id]: 'approved' });
        await db.collection('challenges').doc(chal.id).update({ status: updatedStatus });
        await Gamification.awardHonorCompletion(me.id);
        await Notifications.send(chal.creator, 'challenge_completed', { challengeName: chal.name });
        closeModal('submitProofModal');
        toast('Honor declared! +5 pts', 'success');
        renderPage(currentPage);
        return;
    }

    const file = document.getElementById('proof-file').files[0];
    if (!file) { toast('Please upload a file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('File too large! Max 10MB.', 'error'); return; }

    const btn = document.querySelector('#submitProofModal .btn-primary');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${icon('clock', 14)} Uploading...`;

    try {
        const result = await Cloudinary.upload(file, 'proofs', (pct) => {
            btn.innerHTML = `${icon('clock', 14)} Uploading ${pct}%...`;
        });

        const isVideo = file.type.startsWith('video/');

        // Public challenges → pending_vote; private → pending approval by creator
        const approvedVal = null;

        const newProof = {
            id: 'p' + Date.now(),
            chalId: currentChalForProof,
            fromId: me.id,
            fileType: isVideo ? 'video' : 'image',
            fileName: file.name,
            fileUrl: result.url,
            note,
            date: new Date().toISOString().split('T')[0],
            approved: approvedVal,
            votes: {}
        };

        await DB.addProof(newProof);
        chal.status[me.id] = 'completed';
        // Use targeted update to avoid overwriting the whole doc
        const updatedStatus = Object.assign({}, chal.status || {}, { [me.id]: 'completed' });
        await db.collection('challenges').doc(chal.id).update({ status: updatedStatus });

        // Award points right away only for private challenges (public wait for community vote)
        if (!chal.isPublic) {
            await Gamification.awardCompletion(me.id, chal.difficulty, chal.category, chal.id);
        }

        await Notifications.send(chal.creator, 'challenge_completed', { challengeName: chal.name });

        closeModal('submitProofModal');
        const msg = chal.isPublic
            ? 'Proof submitted. Community voting is now active.'
            : 'Proof submitted! Waiting for creator approval.';
        toast(msg, 'success');
        renderPage(currentPage);
    } catch (error) {
        console.error("Proof submission error:", error);
        toast(error.message || "Failed to submit proof", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

async function viewMyProof(chalId) {
    const me = Auth.me();
    const proofs = await DB.getProofs();
    const proof = proofs.find(p => p.chalId === chalId && p.fromId === me.id);
    if (!proof) return;

    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === chalId);
    const content = document.getElementById('view-proof-content');

    const src = proof.fileData || proof.fileUrl;
    let mediaHTML = '';
    if (src) {
        if (proof.fileType === 'video') {
            mediaHTML = `<video controls style="max-width:100%;max-height:300px;border-radius:8px;"><source src="${src}"></video>`;
        } else {
            mediaHTML = `<img src="${src}" alt="Proof" style="max-width:100%;max-height:300px;border-radius:8px;">`;
        }
    }

    let statusBadge;
    if (proof.isHonor) {
        statusBadge = `<span class="badge badge-gold">${icon('shield', 12)} Honor Declared</span>`;
    } else if (proof.approved === null) {
        const votes = proof.votes || {};
        const vCnt = Object.keys(votes).length;
        statusBadge = `<span class="badge badge-gold">${icon('clock', 12)} ${chal && chal.isPublic ? `Community Voting (${vCnt} votes)` : 'Pending Review'}</span>`;
    } else if (proof.approved) {
        statusBadge = `<span class="badge badge-green">${icon('checkCircle', 12)} Approved</span>`;
    } else {
        statusBadge = `<span class="badge badge-red">${icon('xCircle', 12)} Rejected</span>`;
    }

    content.innerHTML = `
    <div style="background:var(--bg3);border-radius:10px;padding:1rem;margin-bottom:1rem;">
      <div style="font-weight:600;">${chal ? chal.name : 'Unknown'}</div>
    </div>
    ${proof.isHonor ? `<div style="padding:1.5rem;text-align:center;background:var(--bg3);border-radius:10px;margin-bottom:1rem;">${icon('shield', 40)}<div style="margin-top:0.5rem;font-size:0.85rem;color:var(--muted);">Honor declaration — no media proof</div></div>` : `<div class="proof-viewer">${mediaHTML}</div>`}
    ${proof.note ? `<div style="padding:1rem;background:var(--bg3);border-radius:10px;font-style:italic;margin-top:0.75rem;">"${proof.note}"</div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;">
      ${statusBadge}
      <span style="font-size:0.75rem;color:var(--muted);">Submitted ${formatDate(proof.date)}</span>
    </div>`;

    const footer = document.querySelector('#viewProofModal .modal-footer');
    footer.innerHTML = `<button class="btn btn-ghost" onclick="closeModal('viewProofModal')">Close</button>`;
    const title = document.querySelector('#viewProofModal .modal-title');
    title.innerHTML = `${icon('eye', 24)} View Proof`;
    openModal('viewProofModal');
}
