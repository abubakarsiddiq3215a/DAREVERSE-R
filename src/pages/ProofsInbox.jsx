import React, { useState, useEffect, useRef } from 'react';
import { ShieldIcon as Shield, EyeIcon as Eye, UsersIcon as Users, VideoIcon as Video, CameraIcon as Camera, CameraIcon as Image, HelpCircleIcon as HelpCircle } from '../components/Icons';
import { DB } from '../services/db';
import Avatar from '../components/Avatar';
import gsap from 'gsap';

export const ProofsInbox = ({ 
    me, 
    onOpenVerifyProof, 
    onOpenVoteProof, 
    challenges = [], 
    users = [], 
    proofs = [],
    onRefreshData
}) => {
    const containerRef = useRef(null);

    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = u;
    });

    // 1. Creator's private challenge proofs — awaiting manual approval
    const myCreatedPending = proofs.filter(p => {
        const chal = challenges.find(c => c.id === p.chalId);
        return chal && chal.creator === me.id && p.approved === null
            && p.fromId !== me.id
            && (!chal.isPublic || p.status === 'escalated');
    });

    // 2. Public challenge proofs awaiting community vote (user can vote if not creator & not submitter)
    const publicVotePending = proofs.filter(p => {
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

    // GSAP staggered entry
    useEffect(() => {
        if (containerRef.current) {
            const cards = containerRef.current.querySelectorAll('.proof-card');
            if (cards.length > 0) {
                gsap.killTweensOf(cards);
                gsap.fromTo(cards,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
                );
            }
        }
    }, [proofs]);

    const renderProofThumb = (p) => {
        const src = p.fileUrl || p.fileData;

        if (p.isHonor) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '0.3rem' }}>
                    <Shield size={28} style={{ color: 'var(--gold)' }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Honor</span>
                </div>
            );
        } else if (src && p.fileType === 'video') {
            return (
                <>
                    <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', padding: '0.35rem', borderRadius: '50%' }}>
                        <Video size={20} style={{ color: '#fff' }} />
                    </div>
                </>
            );
        } else if (src) {
            return <img src={src} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
        } else {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Image size={28} style={{ color: 'var(--muted)' }} />
                </div>
            );
        }
    };

    return (
        <div className="page" id="page-proofs" ref={containerRef}>
            <div className="section-title">
                Proof <span>Inbox</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '-1rem', marginBottom: '2rem' }}>
                Proofs submitted for verification
            </p>

            {myCreatedPending.length === 0 && publicVotePending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                    <HelpCircle size={40} style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontSize: '0.9rem' }}>No proofs to verify</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Private Host verification */}
                    {myCreatedPending.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.85rem', textTransform: 'uppercase' }}>
                                YOUR HOSTED CHALLENGES — AWAITING YOUR DECISION
                            </div>
                            <div className="grid-auto">
                                {myCreatedPending.map(p => {
                                    const chal = challenges.find(c => c.id === p.chalId);
                                    const fromUser = userMap[p.fromId];
                                    return (
                                        <div 
                                            key={p.id} 
                                            className="proof-card" 
                                            onClick={() => onOpenVerifyProof(p, chal)}
                                        >
                                            <div className="proof-thumb" style={{ position: 'relative' }}>
                                                {renderProofThumb(p)}
                                            </div>
                                            <div className="proof-meta">
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {chal ? chal.name : 'Unknown Challenge'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Avatar user={fromUser} size="xs" />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                        {fromUser ? fromUser.name : 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Community public voting */}
                    {publicVotePending.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.85rem', textTransform: 'uppercase' }}>
                                COMMUNITY VOTE — PUBLIC CHALLENGES
                            </div>
                            <div className="grid-auto">
                                {publicVotePending.map(p => {
                                    const chal = challenges.find(c => c.id === p.chalId);
                                    const fromUser = userMap[p.fromId];
                                    const votesMap = p.votes || {};
                                    const totalVotes = Object.keys(votesMap).length;
                                    const valVotes = Object.values(votesMap).filter(v => v === 'valid').length;

                                    return (
                                        <div 
                                            key={p.id} 
                                            className="proof-card" 
                                            onClick={() => onOpenVoteProof(p, chal)}
                                        >
                                            <div className="proof-thumb" style={{ position: 'relative' }}>
                                                {renderProofThumb(p)}
                                            </div>
                                            <div className="proof-meta">
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {chal ? chal.name : 'Unknown Challenge'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Avatar user={fromUser} size="xs" />
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                            {fromUser ? fromUser.name : 'Unknown'}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 500 }}>
                                                        👍 {valVotes}/{totalVotes} votes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProofsInbox;
