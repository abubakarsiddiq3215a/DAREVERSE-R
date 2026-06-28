import React, { useState } from 'react';
import { EyeIcon as Eye, ShieldIcon as Shield, CheckCircleIcon as CheckCircle, XCircleIcon as XCircle, ThumbsUpIcon as ThumbsUp, ThumbsDownIcon as ThumbsDown, ClockIcon as Clock, UsersIcon as Users } from './Icons';
import { DB } from '../services/db';
import { Gamification } from '../services/gamification';
import { useToast } from './Toast';
import Avatar from './Avatar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const ViewProof = ({ isOpen, onClose, proof, challenge, fromUser, me, mode = 'view', onActionComplete }) => {
    const toastHook = useToast();
    const showMsg = toastHook ? toastHook.showToast : console.log;
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !proof) return null;

    const src = proof.fileUrl || proof.fileData;
    const votes = proof.votes || {};
    const voteCount = Object.keys(votes).length;
    const validCount = Object.values(votes).filter(v => v === 'valid').length;
    const validPct = voteCount ? Math.round(validCount / voteCount * 100) : 0;

    // Relative date formatting
    const formatDate = (d) => {
        if (!d) return '';
        const date = new Date(d);
        const now = new Date();
        const diff = Math.floor((now - date) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const getStatusBadge = () => {
        if (proof.isHonor) {
            return <span className="badge badge-gold"><Shield size={12} /> Honor Declared</span>;
        } else if (proof.approved === null) {
            return (
                <span className="badge badge-gold">
                    <Clock size={12} /> 
                    {challenge?.isPublic ? `Community Voting (${voteCount})` : 'Pending Review'}
                </span>
            );
        } else if (proof.approved) {
            return <span className="badge badge-green"><CheckCircle size={12} /> Approved</span>;
        } else {
            return <span className="badge badge-red"><XCircle size={12} /> Rejected</span>;
        }
    };

    const handleVerifyFake = async () => {
        if (!window.confirm("Are you sure you want to flag this submission as FAKE? This will award a guidelines Strike to the player, reset their streak, and potentially ban them.")) return;
        setSubmitting(true);
        try {
            await DB.updateProof(proof.id, { approved: false, isFake: true });

            if (challenge) {
                const updatedStatus = { ...challenge.status, [proof.fromId]: 'rejected' };
                await DB.updateChallenge(challenge.id, { status: updatedStatus });
            }

            await DB.addStrikeToUser(proof.fromId);
            await Gamification.awardVerification(me.id);

            const notifId = 'n' + Date.now() + 'strike';
            await DB.addNotification({
                id: notifId,
                to: proof.fromId,
                from: me.id,
                fromName: me.name || me.username || 'System Safety',
                type: 'proof_rejected',
                read: false,
                timestamp: new Date().toISOString(),
                message: `Your proof for challenge "${challenge?.name || 'Dare'}" was marked as FAKE. You have received a Guidelines Strike.`
            });

            showMsg('Proof marked as FAKE. Strike applied!', 'error');
            onActionComplete();
            onClose();
        } catch (err) {
            console.error('Verify fake failed:', err);
            showMsg('Failed to process action', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerify = async (approved) => {
        setSubmitting(true);
        try {
            await DB.updateProof(proof.id, { approved });

            if (approved) {
                await Gamification.awardVerification(me.id);
                if (challenge) {
                    const updatedStatus = { ...challenge.status, [proof.fromId]: 'approved' };
                    await DB.updateChallenge(challenge.id, { status: updatedStatus });
                    
                    let prizeShare = 0;
                    if (challenge.hasPrizePool) {
                        const rewards = await DB.distributeChallengeRewards(challenge.id, proof.fromId);
                        if (rewards) {
                            prizeShare = rewards.share;
                        }
                    }

                    const pts = challenge.difficulty === 'hard' ? 50 : challenge.difficulty === 'medium' ? 25 : 10;
                    await Gamification.awardCompletion(proof.fromId, challenge.difficulty, challenge.category, challenge.id);
                    
                    // Create Notification
                    const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                    await DB.addNotification({ // Direct write notification
                        id: notifId,
                        to: proof.fromId,
                        from: me.id,
                        fromName: me.name || me.username || 'Player',
                        type: 'proof_approved',
                        read: false,
                        timestamp: new Date().toISOString(),
                        points: pts,
                        challengeName: challenge.name,
                        prizeShare: prizeShare
                    });
                }
                showMsg('Proof approved!', 'success');
            } else {
                if (challenge) {
                    const updatedStatus = { ...challenge.status, [proof.fromId]: 'rejected' };
                    await DB.updateChallenge(challenge.id, { status: updatedStatus });
                }
                
                // Create Notification
                const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                await DB.addNotification({
                    id: notifId,
                    to: proof.fromId,
                    from: me.id,
                    fromName: me.name || me.username || 'Player',
                    type: 'proof_rejected',
                    read: false,
                    timestamp: new Date().toISOString()
                });
                showMsg('Proof rejected', 'info');
            }

            onActionComplete();
            onClose();
        } catch (err) {
            console.error('Verify failed:', err);
            showMsg('Failed to process verification', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCommunityVote = async (voteValue) => {
        if (votes[me.id]) {
            showMsg('You already voted!', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const updatedVotes = { ...votes, [me.id]: voteValue };
            await DB.updateProof(proof.id, { votes: updatedVotes });

            // Award 1 XP for participating in voting
            await Gamification.awardVoting(me.id);

            // Check thresholds
            const newVoteCount = Object.keys(updatedVotes).length;
            const newValidCount = Object.values(updatedVotes).filter(v => v === 'valid').length;
            const newValidPct = newValidCount / newVoteCount * 100;

            if (newVoteCount >= 5) {
                // Re-fetch document to ensure concurrent safe check
                const proofDocRef = doc(db, 'proofs', proof.id);
                const docSnap = await getDoc(proofDocRef);
                const latest = docSnap.exists() ? docSnap.data() : null;

                if (latest && latest.approved === null) {
                    if (newValidPct >= 70) {
                        // Community approved
                        await DB.updateProof(proof.id, { approved: true, status: 'resolved' });
                        if (challenge) {
                            const updatedStatus = { ...challenge.status, [proof.fromId]: 'approved' };
                            await DB.updateChallenge(challenge.id, { status: updatedStatus });
                            
                            let prizeShare = 0;
                            if (challenge.hasPrizePool) {
                                const rewards = await DB.distributeChallengeRewards(challenge.id, proof.fromId);
                                if (rewards) {
                                    prizeShare = rewards.share;
                                }
                            }

                            const pts = challenge.difficulty === 'hard' ? 50 : challenge.difficulty === 'medium' ? 25 : 10;
                            await Gamification.awardCompletion(proof.fromId, challenge.difficulty, challenge.category, challenge.id);
                            
                            // Send Notification
                            const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                            await DB.addNotification({
                                id: notifId,
                                to: proof.fromId,
                                from: 'community',
                                fromName: 'DareVerse Community',
                                type: 'proof_approved',
                                read: false,
                                timestamp: new Date().toISOString(),
                                points: pts,
                                challengeName: challenge.name,
                                prizeShare: prizeShare
                            });
                        }
                        showMsg('Community approved this proof!', 'success');
                    } else if (newValidPct < 40) {
                        // Community rejected
                        await DB.updateProof(proof.id, { approved: false, status: 'resolved' });
                        if (challenge) {
                            const updatedStatus = { ...challenge.status, [proof.fromId]: 'rejected' };
                            await DB.updateChallenge(challenge.id, { status: updatedStatus });
                        }
                        
                        // Send Notification
                        const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                        await DB.addNotification({
                            id: notifId,
                            to: proof.fromId,
                            from: 'community',
                            fromName: 'DareVerse Community',
                            type: 'proof_rejected',
                            read: false,
                            timestamp: new Date().toISOString()
                        });
                        showMsg('Community rejected this proof!', 'info');
                    } else {
                        // Escalate to challenge creator
                        await DB.updateProof(proof.id, { status: 'escalated' });
                        showMsg('Escalated to challenge creator for review.', 'info');
                    }
                }
            } else {
                showMsg('Vote recorded! +1 pt', 'success');
            }

            onActionComplete();
            onClose();
        } catch (err) {
            console.error('Voting failed:', err);
            showMsg('Failed to record vote', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-title">
                    {mode === 'vote' ? <Users /> : <Eye />} 
                    {mode === 'vote' ? 'Community Proof Vote' : 'View Proof'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-solid)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <Avatar user={fromUser} size="sm" />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {fromUser ? fromUser.name : 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {challenge ? challenge.name : 'Unknown'} · {formatDate(proof.date)}
                        </div>
                    </div>
                </div>

                <div className="proof-viewer" style={{ border: '1px solid var(--border)' }}>
                    {proof.isHonor ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <Shield size={40} style={{ color: 'var(--gold)', margin: '0 auto 0.5rem' }} />
                            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                Honor declaration — no media proof uploaded.
                            </div>
                        </div>
                    ) : src ? (
                        proof.fileType === 'video' ? (
                            <video controls style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px' }}>
                                <source src={src} />
                            </video>
                        ) : (
                            <img src={src} alt="Proof" style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px' }} />
                        )
                    ) : (
                        <div style={{ color: 'var(--muted)', padding: '1.5rem' }}>No media file available.</div>
                    )}
                </div>

                {proof.note && (
                    <div style={{ padding: '1rem', background: 'var(--bg-solid)', borderRadius: '12px', fontStyle: 'italic', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                        "{proof.note}"
                    </div>
                )}

                {/* Show community progress bar if in vote mode or is public challenge */}
                {challenge?.isPublic && !proof.isHonor && (
                    <div style={{ background: 'var(--bg-solid)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ThumbsUp size={13} /> Community Score</span>
                            <span>{validCount} valid / {voteCount} total {voteCount < 5 && <span style={{ color: 'var(--gold)' }}>(min 5 needed)</span>}</span>
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ 
                                    width: `${validPct}%`,
                                    background: validPct >= 70 ? 'var(--green)' : (validPct < 40 && voteCount >= 5) ? 'var(--red)' : 'var(--accent2)'
                                }}
                            ></div>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{validPct}% valid</span>
                            <span>Need 70% to pass</span>
                        </div>
                    </div>
                )}

                <div className="modal-footer">
                    {mode === 'view' && (me?.username === 'admin' || me?.email === 'admin@dareverse.com') && proof.approved !== false && (
                        <button 
                            className="btn btn-danger" 
                            onClick={handleVerifyFake}
                            disabled={submitting}
                            style={{ marginRight: 'auto', background: '#ff3333', color: '#fff', border: 'none' }}
                        >
                            Flag FAKE (Strike)
                        </button>
                    )}

                    <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                        Close
                    </button>

                    {mode === 'verify' && (
                        <>
                            <button 
                                className="btn btn-danger" 
                                onClick={handleVerifyFake}
                                disabled={submitting}
                                style={{ background: '#ff3333', color: '#fff', border: 'none' }}
                            >
                                <XCircle size={14} /> Flag FAKE (Strike)
                            </button>
                            <button 
                                className="btn btn-ghost" 
                                onClick={() => handleVerify(false)} 
                                disabled={submitting}
                                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <XCircle size={14} /> Reject
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => handleVerify(true)} 
                                disabled={submitting}
                            >
                                <CheckCircle size={14} /> Approve & Award Points
                            </button>
                        </>
                    )}

                    {mode === 'vote' && (
                        <>
                            <button 
                                className="btn btn-danger" 
                                onClick={() => handleCommunityVote('invalid')} 
                                disabled={submitting || votes[me?.id]}
                            >
                                <ThumbsDown size={14} /> Invalid
                            </button>
                            <button 
                                className="btn btn-success" 
                                onClick={() => handleCommunityVote('valid')} 
                                disabled={submitting || votes[me?.id]}
                            >
                                <ThumbsUp size={14} /> Valid
                            </button>
                        </>
                    )}

                    {mode === 'view' && (
                        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
                            {getStatusBadge()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewProof;
