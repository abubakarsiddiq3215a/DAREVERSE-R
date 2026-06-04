/* ============================================
   DAREVERSE — Router / Navigation (Firebase)
   ============================================ */

let currentPage = 'feed';
let pageTransitionTimer = null;

function animateActiveNav(name) {
    const targets = [
        document.getElementById('nav-' + name),
        document.getElementById('mob-' + name)
    ].filter(Boolean);

    targets.forEach(target => {
        if (window.gsap) {
            gsap.killTweensOf(target);
            gsap.fromTo(target, { scale: 0.96 }, { scale: 1, duration: 0.28, ease: 'power2.out' });
        }
    });
}

function animatePageContent(page) {
    if (!window.gsap || !page) return;

    const targets = page.querySelectorAll([
        '.page-header',
        '.section-title',
        '.tabs',
        '.stat-card',
        '.card',
        '.challenge-card',
        '.friend-card',
        '.proof-card',
        '.lb-row',
        '.badge-card',
        '.profile-header-card',
        '.profile-stats',
        '.help-section'
    ].join(', '));

    if (!targets.length) return;

    gsap.killTweensOf(targets);
    gsap.fromTo(targets,
        { autoAlpha: 0, y: 14 },
        {
            autoAlpha: 1,
            y: 0,
            duration: 0.36,
            ease: 'power2.out',
            stagger: 0.045,
            clearProps: 'transform,opacity,visibility'
        }
    );
}

async function showPage(name) {
    if (name === currentPage && document.getElementById('page-' + name)?.classList.contains('active')) return;

    if (pageTransitionTimer) {
        clearTimeout(pageTransitionTimer);

        const activePage = document.getElementById('page-' + name);
        animatePageContent(activePage);

        pageTransitionTimer = null;
    }

    const previousPage = document.getElementById('page-' + currentPage);
    currentPage = name;

    if (previousPage) {
        previousPage.classList.remove('active');
        previousPage.classList.add('leaving');
    }

    document.querySelectorAll('.page').forEach(p => {
        if (p !== previousPage) p.classList.remove('active', 'leaving');
    });

    // Desktop nav
    document.querySelectorAll('header nav button').forEach(b => b.classList.remove('active'));
    // Bottom nav
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));

    const page = document.getElementById('page-' + name);
    if (page) {
        page.style.display = 'block';
        if (window.gsap) {
            gsap.killTweensOf(page);
            gsap.set(page, { autoAlpha: 0, y: 14, scale: 0.99 });
            requestAnimationFrame(() => {
                page.classList.add('active');
                gsap.to(page, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.42,
                    ease: 'power3.out'
                });
            });
        } else {
            requestAnimationFrame(() => page.classList.add('active'));
        }
    }

    const navBtn = document.getElementById('nav-' + name);
    if (navBtn) navBtn.classList.add('active');

    const mobBtn = document.getElementById('mob-' + name);
    if (mobBtn) mobBtn.classList.add('active');

    animateActiveNav(name);

    if (window.gsap && previousPage && previousPage !== page) {
        gsap.killTweensOf(previousPage);
        gsap.to(previousPage, {
            autoAlpha: 0,
            y: -8,
            scale: 0.985,
            duration: 0.24,
            ease: 'power2.inOut',
            onComplete: () => {
                previousPage.style.display = 'none';
                previousPage.classList.remove('leaving');
            }
        });
    }

    pageTransitionTimer = setTimeout(() => {
        if (!window.gsap) {
            document.querySelectorAll('.page').forEach(p => {
                if (!p.classList.contains('active')) {
                    p.style.display = 'none';
                    p.classList.remove('leaving');
                }
            });
        } else {
            document.querySelectorAll('.page').forEach(p => {
                if (p !== page && p !== previousPage) {
                    p.style.display = 'none';
                    p.classList.remove('leaving');
                }
            });
        }
        pageTransitionTimer = null;
    }, 240);

    await renderPage(name);
    window.scrollTo(0, 0);
}

async function renderPage(name) {
    switch (name) {
        case 'feed': await renderFeed('all'); break;
        case 'challenges': await renderChallenges('created'); break;
        case 'friends': await renderFriends('friends'); break;
        case 'proofs': await renderProofs(); break;
        case 'leaderboard': await renderLeaderboard('friends'); break;
        case 'profile': await renderProfile(); break;
    }
}

async function initApp() {
    // Firebase Auth is async, so we use the listener
    Auth.initAuthListener(async (user) => {
        if (!user) return; // Auth.js will redirect to login

        try {
            const me = Auth.me();
            if (!me) {
                console.warn('Auth listener: no profile cached for user', user && user.uid);
                return;
            }

            // Set user badge in header (with profile image support)
            const userBadge = document.getElementById('user-badge-area');
            if (userBadge) {
                const avatarInner = me.profileImage
                    ? `<div class="avatar me" style="padding:0;overflow:hidden;"><img src="${me.profileImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>`
                    : `<div class="avatar me">${me.initials}</div>`;
                userBadge.innerHTML = `
                    ${avatarInner}
                    <span class="user-name-text" style="font-size:0.85rem;font-weight:500;">${me.name.split(' ')[0]}</span>
                `;
            }

            // Set greeting
            const greet = document.getElementById('feed-greeting');
            if (greet) greet.textContent = me.name ? me.name.split(' ')[0] : 'Player';

            const adminBtn = document.getElementById('admin-launch-btn');
            if (adminBtn) {
                const canOpenAdmin = await isCurrentUserAdmin();
                adminBtn.style.display = canOpenAdmin ? '' : 'none';
            }

            // Start real-time notifications
            Notifications.startListener(me.id);

            // Update stat cards
            const el = (id) => document.getElementById(id);
            let gameData = {};
            try {
                gameData = await DB.getGameData(me.id);
            } catch (err) {
                console.error('DB.getGameData failed:', err);
            }
            if (el('stat-completed')) el('stat-completed').textContent = (gameData && gameData.totalCompleted) || 0;
            if (el('stat-created')) el('stat-created').textContent = (gameData && gameData.totalCreated) || 0;

            let friends = [];
            try {
                friends = await DB.getFriends(me.id);
            } catch (err) {
                console.error('DB.getFriends failed:', err);
            }
            if (el('stat-friends')) el('stat-friends').textContent = friends.length;

            // Check notification dots
            let requests = [];
            try {
                requests = await DB.getRequests(me.id);
            } catch (err) {
                console.error('DB.getRequests failed:', err);
            }
            hideDotIfEmpty('friend-dot', requests.length);
            hideDotIfEmpty('mob-friend-dot', requests.length);

            let proofs = [];
            let challenges = [];
            try {
                proofs = await DB.getProofs();
            } catch (err) {
                console.error('DB.getProofs failed:', err);
            }
            try {
                challenges = await DB.getChallenges();
            } catch (err) {
                console.error('DB.getChallenges failed:', err);
            }
            const pendingProofs = proofs.filter(p => {
                const chal = challenges.find(c => c.id === p.chalId);
                return chal && chal.creator === me.id && p.approved === null && p.fromId !== me.id;
            });
            hideDotIfEmpty('proof-dot', pendingProofs.length);
            hideDotIfEmpty('mob-proof-dot', pendingProofs.length);

            initModals();

            await showPage('feed');
        } catch (error) {
            console.error('initApp: Error while initializing user data:', error);
            // If it's a Firestore permission error, redirect to login and surface a friendly message
            if (error && error.code === 'permission-denied') {
                alert('Permission error when accessing database - please check your Firebase rules or sign-in status.');
                try { await auth.signOut(); } catch (e) { }
                window.location.href = 'index.html';
            }
        }
    });
}
