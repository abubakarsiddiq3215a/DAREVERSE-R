/* ============================================
   DAREVERSE — Gamification Engine (Firebase)
   ============================================ */

const Gamification = {
    // Ranks configuration
    RANKS: [
        { name: 'Rookie',     min: 0,     css: 'rank-rookie' },
        { name: 'Challenger', min: 150,   css: 'rank-challenger' },
        { name: 'DareDevil',  min: 600,   css: 'rank-daredevil' },
        { name: 'Legend',     min: 2500,  css: 'rank-legend' },
        { name: 'Champion',   min: 6000,  css: 'rank-champion' }
    ],

    // Badge definitions
    BADGES: {
        'First Blood':      { icon: 'zap',        desc: 'Complete your first challenge' },
        'On Fire':          { icon: 'flame',       desc: 'Maintain a 7-day streak' },
        'Unstoppable':      { icon: 'award',       desc: 'Complete 10 hard challenges' },
        'Socialite':        { icon: 'userPlus',    desc: 'Add 10 friends' },
        'Creator':          { icon: 'plus',        desc: 'Create 5 challenges' },
        'Verifier':         { icon: 'checkCircle', desc: 'Approve 5 proofs' },
        'DomainMaster':     { icon: 'star',        desc: 'Complete 10 challenges in one category' },
        'Social Butterfly': { icon: 'share2',      desc: 'Share 5 challenges to WhatsApp' }
    },

    // Get current rank based on points
    getRank(points) {
        for (let i = this.RANKS.length - 1; i >= 0; i--) {
            if (points >= this.RANKS[i].min) return this.RANKS[i];
        }
        return this.RANKS[0];
    },

    getNextRank(points) {
        return this.RANKS.find(r => r.min > points) || null;
    },

    getProgressToNextRank(points) {
        const current = this.getRank(points);
        const next = this.getNextRank(points);
        if (!next) return 100;
        const total = next.min - current.min;
        const progress = points - current.min;
        return Math.min(100, (progress / total) * 100);
    },

    getRankBadge(points) {
        const rank = this.getRank(points);
        return `<span class="rank-badge ${rank.css}">${icon('award', 12)} ${rank.name}</span>`;
    },

    // Point Awards
    async awardCompletion(userId, difficulty, category, chalId) {
        const data = await DB.getGameData(userId);
        const ptsMap = { easy: 10, medium: 25, hard: 50 };
        let pts = ptsMap[difficulty] || 10;

        // Early Bird bonus — be in first 10 completers
        if (chalId) {
            const challenges = await DB.getChallenges();
            const chal = challenges.find(c => c.id === chalId);
            if (chal) {
                const completedCount = Object.values(chal.status).filter(s => s === 'approved' || s === 'completed').length;
                if (completedCount <= 10) {
                    pts += 15;
                    toast('+15 Early Bird Bonus!', 'success');
                }

                // Creator popularity bonuses
                if (completedCount === 10) {
                    await this.awardPopularity(chal.creator, 20, chal.name);
                } else if (completedCount === 50) {
                    await this.awardPopularity(chal.creator, 50, chal.name);
                }

            }
        }

        data.rankPoints += pts;
        data.totalCompleted += 1;

        // Update category stats
        if (!data.completedByCategory) data.completedByCategory = {};
        data.completedByCategory[category] = (data.completedByCategory[category] || 0) + 1;

        // ---- Badge checks ----

        // First Blood
        if (data.totalCompleted === 1 && !data.badges.includes('First Blood')) {
            data.badges.push('First Blood');
            toast('Badge Earned: First Blood!', 'info');
        }

        // Unstoppable — 10 hard challenges
        const hardCount = (data.hardCompleted || 0) + (difficulty === 'hard' ? 1 : 0);
        data.hardCompleted = hardCount;
        if (hardCount >= 10 && !data.badges.includes('Unstoppable')) {
            data.badges.push('Unstoppable');
            toast('Badge Earned: Unstoppable!', 'info');
        }

        // DomainMaster — 10 in one category
        if (data.completedByCategory[category] >= 10 && !data.badges.includes('DomainMaster')) {
            data.badges.push('DomainMaster');
            toast(`Badge Earned: Domain Master in ${category}!`, 'info');
        }

        // Streak logic
        const today = new Date().toISOString().split('T')[0];
        if (data.lastChallengeDate) {
            const last = new Date(data.lastChallengeDate);
            const diff = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));

            if (diff === 1) {
                data.currentStreak += 1;

                // Streak Bonuses
                if (data.currentStreak === 5) {
                    data.rankPoints += 30;
                    toast('5-Day Streak! +30 pts', 'success');
                } else if (data.currentStreak === 10) {
                    data.rankPoints += 75;
                    toast('10-Day Streak! +75 pts', 'success');
                }

                if (data.currentStreak > data.longestStreak) data.longestStreak = data.currentStreak;
                if (data.currentStreak >= 7 && !data.badges.includes('On Fire')) {
                    data.badges.push('On Fire');
                    toast('Badge Earned: On Fire!', 'info');
                }
            } else if (diff > 1) {
                data.currentStreak = 1;
            }
        } else {
            data.currentStreak = 1;
        }
        data.lastChallengeDate = today;

        await DB.saveGameData(userId, data);
        return data;
    },

    // Honor-based challenge: auto-approve with 5 pts
    async awardHonorCompletion(userId) {
        const data = await DB.getGameData(userId);
        data.rankPoints += 5;
        data.totalCompleted += 1;
        await DB.saveGameData(userId, data);
        toast('+5 pts — Honor completion!', 'success');
        return data;
    },

    // Award for voting on a community proof
    async awardVoting(userId) {
        const data = await DB.getGameData(userId);
        data.rankPoints += 1;
        await DB.saveGameData(userId, data);
        return data;
    },

    // Award for sharing to WhatsApp
    async awardShare(userId) {
        const data = await DB.getGameData(userId);
        if (!data.shareCount) data.shareCount = 0;
        data.shareCount += 1;
        data.rankPoints += 2;

        if (data.shareCount >= 5 && !data.badges.includes('Social Butterfly')) {
            data.badges.push('Social Butterfly');
            toast('Badge Earned: Social Butterfly!', 'info');
        }

        await DB.saveGameData(userId, data);
        return data;
    },

    // Helper for awarding points to creators when their dares go viral
    async awardPopularity(creatorId, pts, chalName) {
        const data = await DB.getGameData(creatorId);
        data.rankPoints += pts;
        await DB.saveGameData(creatorId, data);

        const me = Auth.me();
        if (me && me.id === creatorId) {
            toast(`Popularity Bonus! "${chalName}" hit a milestone: +${pts} pts`, 'success');
        }
    },

    async awardCreation(userId) {
        const data = await DB.getGameData(userId);
        data.rankPoints += 5;
        data.totalCreated += 1;

        if (data.totalCreated === 5 && !data.badges.includes('Creator')) {
            data.badges.push('Creator');
            toast('Badge Earned: Creator!', 'info');
        }

        await DB.saveGameData(userId, data);
        return data;
    },

    async awardVerification(userId) {
        const data = await DB.getGameData(userId);
        if (!data.verificationsCount) data.verificationsCount = 0;
        data.rankPoints += 2;
        data.verificationsCount += 1;

        if (data.verificationsCount >= 5 && !data.badges.includes('Verifier')) {
            data.badges.push('Verifier');
            toast('Badge Earned: Verifier!', 'info');
        }

        await DB.saveGameData(userId, data);
        return data;
    },

    async awardFriendship(userId) {
        const data = await DB.getGameData(userId);
        const friends = await DB.getFriends(userId);
        if (friends.length >= 10 && !data.badges.includes('Socialite')) {
            data.badges.push('Socialite');
            toast('Badge Earned: Socialite!', 'info');
            await DB.saveGameData(userId, data);
        }
    }
};
