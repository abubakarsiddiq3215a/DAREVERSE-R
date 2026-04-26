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
        items = challenges.filter(c => c.targets.includes(me.id) && c.status[me.id] === 'completed');
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
    
    // BUG FIX: was using `q` instead of `query`
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
    setTimeout(() => { addTag('@friend', id); }, 100);
}

async function createChallenge() {
    const me = Auth.me();
    const name = document.getElementById('chal-name').value.trim();
    const desc = document.getElementById('chal-desc').value.trim();
    const proofType = document.getElementById('chal-proof').value;
    const category = document.getElementById('chal-cat').value;
    const difficulty = document.getElementById('chal-diff').value;
    const deadline = document.getElementById('chal-deadline').value || null;

    if (!name) { toast('Please enter a challenge name'); return; }
    if (!desc) { toast('Please describe how to complete it'); return; }
    if (!taggedUsers.length) { toast('Tag at least one friend to send this to'); return; }

    const targets = taggedUsers.map(t => t.id);
    const status = {};
    targets.forEach(id => status[id] = 'pending');

    const chalId = 'c' + Date.now();
    const newChal = {
        id: chalId,
        name, desc, category, proofType, difficulty,
        creator: me.id,
        targets, status,
        deadline,
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

    const gameData = await DB.getGameData(me.id);
    const el = document.getElementById('stat-created');
    if (el) el.textContent = gameData.totalCreated;

    closeModal('createChallengeModal');
    toast(`Challenge sent!`, 'success');
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
// Deadline helpers (restored — were missing)
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
// File selection handler (was missing)
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

    document.getElementById('proof-chal-info').innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:1rem;">
      <div style="font-weight:600;margin-bottom:0.25rem;">${getCategoryIcon(chal.category)} ${chal.name}</div>
      <div style="font-size:0.8rem;color:var(--muted);">${chal.desc}</div>
    </div>`;

    const uploadIcon = document.getElementById('proof-upload-icon');
    uploadIcon.innerHTML = icon(chal.proofType === 'video' ? 'video' : 'camera', 32);
    document.getElementById('proof-upload-text').textContent = 'Click to upload proof (max 10MB)';
    document.getElementById('proof-upload-area').classList.remove('has-file');
    document.getElementById('proof-file').value = '';
    document.getElementById('proof-note').value = '';
    openModal('submitProofModal');
}

async function submitProof() {
    const me = Auth.me();
    const challenges = await DB.getChallenges();
    const chal = challenges.find(c => c.id === currentChalForProof);
    const file = document.getElementById('proof-file').files[0];
    const note = document.getElementById('proof-note').value || 'Completed!';

    if (!file) { toast('Please upload a file'); return; }
    
    if (file.size > 10 * 1024 * 1024) {
        toast('File too large! Max 10MB.', 'error');
        return;
    }

    const btn = document.querySelector('#submitProofModal .btn-primary');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${icon('clock', 14)} Uploading...`;

    try {
        // Upload to Cloudinary with progress
        const result = await Cloudinary.upload(file, 'proofs', (pct) => {
            btn.innerHTML = `${icon('clock', 14)} Uploading ${pct}%...`;
        });

        const isVideo = file.type.startsWith('video/');
        
        const newProof = {
            id: 'p' + Date.now(),
            chalId: currentChalForProof,
            fromId: me.id,
            fileType: isVideo ? 'video' : 'image',
            fileName: file.name,
            fileUrl: result.url,
            note,
            date: new Date().toISOString().split('T')[0],
            approved: null
        };

        await DB.addProof(newProof);
        chal.status[me.id] = 'completed';
        await DB.addChallenge(chal);
        await Gamification.awardCompletion(me.id, chal.difficulty, chal.category);

        // Notify challenge creator
        await Notifications.send(chal.creator, 'challenge_completed', { challengeName: chal.name });

        closeModal('submitProofModal');
        toast('Proof submitted!', 'success');
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

    const statusBadge = proof.approved === null ? `<span class="badge badge-gold">${icon('clock', 12)} Pending Review</span>`
        : proof.approved ? `<span class="badge badge-green">${icon('checkCircle', 12)} Approved</span>`
        : `<span class="badge badge-red">${icon('xCircle', 12)} Rejected</span>`;

    content.innerHTML = `
    <div style="background:var(--bg3);border-radius:10px;padding:1rem;margin-bottom:1rem;">
      <div style="font-weight:600;">${chal ? chal.name : 'Unknown'}</div>
    </div>
    <div class="proof-viewer">${mediaHTML}</div>
    ${proof.note ? `<div style="padding:1rem;background:var(--bg3);border-radius:10px;font-style:italic;margin-top:0.75rem;">"${proof.note}"</div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;">
      ${statusBadge}
      <span style="font-size:0.75rem;color:var(--muted);">Submitted ${formatDate(proof.date)}</span>
    </div>`;

    const footer = document.querySelector('#viewProofModal .modal-footer');
    footer.innerHTML = `<button class="btn btn-ghost" onclick="closeModal('viewProofModal')">Close</button>`;
    openModal('viewProofModal');
}
