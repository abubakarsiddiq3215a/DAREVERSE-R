import { DB } from './db';

// Toast system bridge
let toastTrigger = null;
export const registerToastTrigger = (fn) => {
    toastTrigger = fn;
};

export const toast = (msg, type = 'default') => {
    if (toastTrigger) {
        toastTrigger(msg, type);
    } else {
        console.log(`[Toast ${type}] ${msg}`);
    }
};

export const Gamification = {
    // Ranks configuration
    RANKS: [
        { name: 'Rookie',       min: 0,         css: 'rank-rookie' },
        { name: 'Challenger',   min: 100,       css: 'rank-challenger' },
        { name: 'DareDevil',    min: 500,       css: 'rank-daredevil' },
        { name: 'Specialist',   min: 1500,      css: 'rank-specialist' },
        { name: 'Elite',        min: 5000,      css: 'rank-elite' },
        { name: 'Master',       min: 15000,     css: 'rank-master' },
        { name: 'Grandmaster',  min: 50000,     css: 'rank-grandmaster' },
        { name: 'Champion',     min: 150000,    css: 'rank-champion' },
        { name: 'Hero',         min: 500000,    css: 'rank-hero' },
        { name: 'Dare Legend',  min: 1000000,   css: 'rank-legend' }
    ],

    // Badge definitions
    BADGES: {
        'First Blood':      { icon: 'Zap',         desc: 'Complete your first challenge' },
        'On Fire':          { icon: 'Flame',       desc: 'Maintain a 7-day streak' },
        'Unstoppable':      { icon: 'Award',       desc: 'Complete 10 hard challenges' },
        'Socialite':        { icon: 'UserPlus',    desc: 'Add 10 friends' },
        'Creator':          { icon: 'Plus',        desc: 'Create 5 challenges' },
        'Verifier':         { icon: 'CheckCircle', desc: 'Approve 5 proofs' },
        'DomainMaster':     { icon: 'Star',        desc: 'Complete 10 challenges in one category' },
        'Social Butterfly': { icon: 'Share2',      desc: 'Share 5 challenges to WhatsApp' }
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

    // Point Awards
    async awardCompletion(userId, difficulty, category, chalId) {
        const data = await DB.getGameData(userId);
        // Blueprint: Dares (+50) + Wins (+100) = 150 total XP
        let pts = 150;

        // Early Bird bonus — be in first 10 completers
        if (chalId) {
            const challenges = await DB.getChallenges();
            const chal = challenges.find(c => c.id === chalId);
            if (chal) {
                const completedCount = Object.values(chal.status || {}).filter(s => s === 'approved' || s === 'completed').length;
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

        data.rankPoints = (data.rankPoints || 0) + pts;
        data.totalCompleted = (data.totalCompleted || 0) + 1;

        // Track Wins
        data.wins = (data.wins || 0) + 1;
        if (!data.winsByCategory) data.winsByCategory = {};
        data.winsByCategory[category] = (data.winsByCategory[category] || 0) + 1;

        // Track Hard Completed Category
        if (!data.hardCompletedByCategory) data.hardCompletedByCategory = {};
        if (difficulty === 'hard') {
            data.hardCompletedByCategory[category] = (data.hardCompletedByCategory[category] || 0) + 1;
        }

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
                data.currentStreak = (data.currentStreak || 0) + 1;

                // Streak Bonuses
                if (data.currentStreak === 5) {
                    data.rankPoints += 30;
                    toast('5-Day Streak! +30 pts', 'success');
                } else if (data.currentStreak === 10) {
                    data.rankPoints += 75;
                    toast('10-Day Streak! +75 pts', 'success');
                }

                if (data.currentStreak > (data.longestStreak || 0)) {
                    data.longestStreak = data.currentStreak;
                }
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
        data.rankPoints = (data.rankPoints || 0) + 5;
        data.totalCompleted = (data.totalCompleted || 0) + 1;
        await DB.saveGameData(userId, data);
        toast('+5 pts — Honor completion!', 'success');
        return data;
    },

    // Award for voting on a community proof
    async awardVoting(userId) {
        const data = await DB.getGameData(userId);
        data.rankPoints = (data.rankPoints || 0) + 1;
        await DB.saveGameData(userId, data);
        return data;
    },

    // Award for sharing to WhatsApp
    async awardShare(userId) {
        const data = await DB.getGameData(userId);
        if (!data.shareCount) data.shareCount = 0;
        data.shareCount += 1;

        // Daily sharing point award check (+10 pts, max 50/day)
        const today = new Date().toISOString().split('T')[0];
        if (data.lastShareDate !== today) {
            data.lastShareDate = today;
            data.dailySharePoints = 0;
        }

        if ((data.dailySharePoints || 0) < 50) {
            data.rankPoints = (data.rankPoints || 0) + 10;
            data.dailySharePoints = (data.dailySharePoints || 0) + 10;
            toast('+10 pts — Shared to WhatsApp!', 'success');
        } else {
            toast('WhatsApp share registered (Daily XP limit reached)', 'info');
        }

        if (data.shareCount >= 5 && !data.badges.includes('Social Butterfly')) {
            data.badges.push('Social Butterfly');
            toast('Badge Earned: Social Butterfly!', 'info');
        }

        await DB.saveGameData(userId, data);
        return data;
    },

    // Award popularity to creators
    async awardPopularity(creatorId, pts, chalName) {
        const data = await DB.getGameData(creatorId);
        data.rankPoints = (data.rankPoints || 0) + pts;
        await DB.saveGameData(creatorId, data);
    },

    async awardCreation(userId) {
        const data = await DB.getGameData(userId);
        data.rankPoints = (data.rankPoints || 0) + 5;
        data.totalCreated = (data.totalCreated || 0) + 1;

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
        data.rankPoints = (data.rankPoints || 0) + 2;
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
