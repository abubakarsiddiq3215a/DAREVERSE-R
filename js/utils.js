/* ============================================
   DAREVERSE — Utilities
   ============================================ */

function toast(msg, type = 'default') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const iconMap = { success: 'checkCircle', error: 'xCircle', info: 'zap' };
    const ic = iconMap[type];
    t.innerHTML = (ic ? icon(ic) : '') + `<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 300); }, 3500);
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function emptyState(msg) {
    return `<div style="text-align:center;padding:3rem 1rem;color:var(--muted);">
    <div style="margin-bottom:0.75rem;">${icon('search', 40)}</div>
    <div style="font-size:0.9rem;">${msg}</div>
  </div>`;
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function hideDotIfEmpty(id, count) {
    const dot = document.getElementById(id);
    if (dot) dot.style.display = count === 0 ? 'none' : '';
}

// Category helpers
function getCategoryIcon(cat) {
    const mapping = CategoryIcons[cat] || 'zap';
    return icon(mapping);
}

function getCategoryLabel(cat) {
    const labels = { fitness: 'Fitness', gaming: 'Gaming', food: 'Food', creative: 'Creative', brain: 'Brain', outdoor: 'Outdoor', funny: 'Funny' };
    return labels[cat] || cat;
}

function getDifficultyBadge(diff) {
    const cls = diff === 'easy' ? 'diff-easy' : diff === 'medium' ? 'diff-medium' : 'diff-hard';
    const label = diff.charAt(0).toUpperCase() + diff.slice(1);
    return `<span class="badge ${cls}">${label}</span>`;
}

function getProofTypeBadge(pt) {
    if (pt === 'video') return `<span class="badge badge-blue">${icon('video')} Video</span>`;
    if (pt === 'image') return `<span class="badge badge-blue">${icon('camera')} Image</span>`;
    return `<span class="badge badge-blue">${icon('camera')} / ${icon('video')}</span>`;
}

// File size warning
function checkFileSize(file) {
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        toast('File too large! Max 2MB for localStorage storage.', 'error');
        return false;
    }
    return true;
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Avatar HTML helper
function avatarHTML(user, isMe, size) {
    const sizeClass = size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : '';
    const colorClass = isMe ? 'me' : 'friend';
    const initials = user.initials || DB.getInitials(user.name);
    return `<div class="avatar ${colorClass}${sizeClass}">${initials}</div>`;
}

// Initialize modal close on overlay click
function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
    });
}
