import React from 'react';
import { HelpCircleIcon as HelpCircle, ZapIcon as Zap, TrophyIcon as Trophy, FlameIcon as Flame, AwardIcon as Award, UserPlusIcon as UserPlus, PlusIcon as Plus, CheckCircleIcon as CheckCircle, StarIcon as Star, Share2Icon as Share2, ShieldIcon as Shield, HeartIcon as Heart } from './Icons';

export const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const badges = [
        { label: 'First Blood', desc: 'Complete your first challenge', color: 'var(--accent)', icon: <Zap size={20} /> },
        { label: 'On Fire', desc: 'Maintain a 7-day streak', color: 'var(--accent2)', icon: <Flame size={20} /> },
        { label: 'Unstoppable', desc: 'Complete 10 hard challenges', color: 'var(--gold)', icon: <Award size={20} /> },
        { label: 'Socialite', desc: 'Add 10 friends', color: 'var(--neon)', icon: <UserPlus size={20} /> },
        { label: 'Creator', desc: 'Create 5 challenges', color: 'var(--green)', icon: <Plus size={20} /> },
        { label: 'Verifier', desc: 'Approve 5 proofs', color: 'var(--green)', icon: <CheckCircle size={20} /> },
        { label: 'Domain Master', desc: '10 challenges in one category', color: 'var(--gold)', icon: <Star size={20} /> },
        { label: 'Social Butterfly', desc: 'Share 5 challenges to WhatsApp', color: 'var(--purple)', icon: <Share2 size={20} /> }
    ];

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '640px' }}>
                <div className="modal-title">
                    <HelpCircle size={24} style={{ color: 'var(--neon)' }} /> How DareVerse Works
                </div>

                <div className="help-section">
                    <div className="help-heading"><Zap size={16} /> The Basics</div>
                    <ul className="help-list">
                        <li><strong>Create a Challenge:</strong> Dare your friends with fun tasks. Tag them to send the challenge.</li>
                        <li><strong>I Dare:</strong> Accept a challenge and upload a photo or video as evidence (up to 10MB, auto-compressed).</li>
                        <li><strong>Verify Proofs:</strong> As a challenge creator, you review and approve or reject your friends' submissions.</li>
                        <li><strong>Earn Points:</strong> Get ranked points for completing challenges, creating them, and verifying proofs.</li>
                    </ul>
                </div>

                <div className="help-section">
                    <div className="help-heading"><Trophy size={16} /> Ranking System</div>
                    <div className="help-ranks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div className="help-rank-item"><span className="rank-badge rank-rookie">Rookie</span><span className="help-rank-pts">0 pts</span></div>
                        <div className="help-rank-item"><span className="rank-badge rank-challenger">Challenger</span><span className="help-rank-pts">150 pts</span></div>
                        <div className="help-rank-item"><span className="rank-badge rank-daredevil">DareDevil</span><span className="help-rank-pts">600 pts</span></div>
                        <div className="help-rank-item"><span className="rank-badge rank-legend">Legend</span><span className="help-rank-pts">2500 pts</span></div>
                        <div className="help-rank-item"><span className="rank-badge rank-champion">Champion</span><span className="help-rank-pts">6000 pts</span></div>
                    </div>
                </div>

                <div className="help-section">
                    <div className="help-heading"><Star size={16} /> Points Breakdown</div>
                    <ul className="help-list">
                        <li><strong>Easy / Med / Hard:</strong> +10 / +25 / +50 pts</li>
                        <li><strong>Honor Challenge:</strong> +5 pts (auto-approved, no proof needed)</li>
                        <li><strong>Early Bird:</strong> +15 bonus (Be in first 10 completers)</li>
                        <li><strong>Viral Creator:</strong> +20 pts (10 completions) / +50 pts (50 completions)</li>
                        <li><strong>Streak Bonus:</strong> +30 pts (5-day) / +75 pts (10-day)</li>
                        <li><strong>Community Vote:</strong> +1 pt per vote cast on public proofs</li>
                        <li><strong>WhatsApp Share:</strong> +2 pts per share</li>
                        <li><strong>Standard Actions:</strong> Create (+5) / Verify (+2)</li>
                    </ul>
                </div>

                <div className="help-section">
                    <div className="help-heading"><Award size={16} /> Badge System</div>
                    <div className="help-badges-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {badges.map((b, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-solid)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <div style={{ color: b.color, display: 'flex', alignItems: 'center' }}>
                                    {b.icon}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.label}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="help-section">
                    <div className="help-heading"><Shield size={16} /> Rules &amp; Safeguards</div>
                    <ul className="help-list">
                        <li>Be respectful - no harmful, offensive, or dangerous stunts.</li>
                        <li>Submit genuine proof - fake submissions will be caught by community voting.</li>
                        <li><strong>Public challenges</strong>: proofs are verified by community vote (5+ votes, 70%+ valid = approved).</li>
                        <li><strong>Private challenges</strong>: challenge creator has final say on approval/rejection.</li>
                        <li><strong>Honor challenges</strong>: self-declared completion, auto-approved for +5 pts only.</li>
                        <li>Keep challenges fun and safe.</li>
                    </ul>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
