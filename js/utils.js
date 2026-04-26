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
    const labels = {
        fitness: 'Fitness',
        gaming: 'Gaming',
        food: 'Food',
        creative: 'Creative',
        entertainment: 'Entertainment',
        honor: 'Honor',
        social: 'Social',
        education: 'Education'
    };
    return labels[cat] || cat;
}

function getDifficultyBadge(diff) {
    if (!diff) return '';
    const cls = diff === 'easy' ? 'diff-easy' : diff === 'medium' ? 'diff-medium' : 'diff-hard';
    const label = diff.charAt(0).toUpperCase() + diff.slice(1);
    return `<span class="badge ${cls}">${label}</span>`;
}

function getProofTypeBadge(pt) {
    if (!pt) return '';
    if (pt === 'video') return `<span class="badge badge-blue">${icon('video')} Video</span>`;
    if (pt === 'image') return `<span class="badge badge-blue">${icon('camera')} Image</span>`;
    return `<span class="badge badge-blue">${icon('camera')} / ${icon('video')}</span>`;
}

// File size warning
function checkFileSize(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB (Cloudinary)
    if (file.size > maxSize) {
        toast('File too large! Max 10MB.', 'error');
        return false;
    }
    return true;
}

// Convert file to base64 (kept for backward compatibility)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Avatar HTML helper — supports profile images
function avatarHTML(user, isMe, size) {
    if (!user) {
        // Fallback for missing user
        const sizeClass = size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : size === 'xs' ? ' xs' : '';
        return `<div class="avatar friend${sizeClass}">?</div>`;
    }
    const sizeClass = size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : size === 'xs' ? ' xs' : '';
    const colorClass = isMe ? 'me' : 'friend';
    const initials = user.initials || DB.getInitials(user.name || '?');
    
    if (user.profileImage) {
        return `<div class="avatar ${colorClass}${sizeClass}" style="padding:0;overflow:hidden;"><img src="${user.profileImage}" alt="${user.name || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>`;
    }
    return `<div class="avatar ${colorClass}${sizeClass}">${initials}</div>`;
}

// Initialize modal close on overlay click
function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
    });
}

// WhatsApp share helper
function shareToWhatsApp(chalName, chalDesc, username) {
    const rawName = username || Auth.me()?.name || 'A DareVerse player';
    const playerName = rawName.startsWith('@') ? rawName : `@${rawName}`;
    const text = `*DareVerse Challenge*\n\n*${chalName}*\n${chalDesc}\n\nShared by: ${playerName}\nThink you can do it? Join DareVerse and prove yourself.\n${window.location.origin}/app.html`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Get visibility badge
function getVisibilityBadge(visibility) {
    if (visibility === 'public') return `<span class="badge badge-purple">${icon('globe', 11)} Public</span>`;
    return `<span class="badge badge-blue">${icon('lock', 11)} Friends</span>`;
}

// Get honor-based badge
function getHonorBadge(isHonor) {
    if (isHonor) return `<span class="badge badge-gold">${icon('shield', 11)} Honor</span>`;
    return '';
}

async function isCurrentUserAdmin() {
    const me = Auth.me();
    if (!me) return false;

    try {
        const doc = await db.collection('admins').doc(me.id).get();
        return doc.exists;
    } catch (error) {
        console.warn('Admin lookup failed:', error);
        return false;
    }
}

function openAdminPage() {
    sessionStorage.setItem('dv_admin_entry', JSON.stringify({
        ts: Date.now()
    }));
    window.location.href = 'admin.html';
}
