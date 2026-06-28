import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon as Sparkles, XIcon as X, UsersIcon as Users, GlobeIcon as Globe, ShieldIcon as Shield, CalendarIcon as Calendar, FilmIcon as Film } from './Icons';
import { DB } from '../services/db';
import { Gamification } from '../services/gamification';
import { Cloudinary } from '../services/upload';
import { useToast } from './Toast';
import Avatar from './Avatar';

export const CreateChallenge = ({ isOpen, onClose, me, friendsList, onChallengeCreated, onTriggerPayment }) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [visibility, setVisibility] = useState('friends');
    const [difficulty, setDifficulty] = useState('medium');
    const [deadline, setDeadline] = useState('');
    const [proofType, setProofType] = useState('both');
    const [category, setCategory] = useState('fitness');
    const [isHonor, setIsHonor] = useState(false);
    const [hasPrizePool, setHasPrizePool] = useState(false);
    const [prizePoolAmount, setPrizePoolAmount] = useState('');
    const [winnersLimit, setWinnersLimit] = useState(5);
    const [gameData, setGameData] = useState(null);
    const [publicCompletedCount, setPublicCompletedCount] = useState(0);
    
    // Example proof upload states
    const [exampleFile, setExampleFile] = useState(null);
    const [uploadingExample, setUploadingExample] = useState(false);
    const [exampleUploadProgress, setExampleUploadProgress] = useState(0);
    
    // Tagging state
    const [tagInput, setTagInput] = useState('');
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const tagInputRef = useRef(null);

    // Fetch gamification profile to verify creator license & dares completed
    useEffect(() => {
        if (isOpen && me) {
            DB.getGameData(me.id).then(setGameData);
            
            DB.getChallenges().then(allChallenges => {
                const count = allChallenges.filter(c => 
                    (c.isPublic || c.visibility === 'public') && 
                    (c.status?.[me.id] === 'approved' || c.status?.[me.id] === 'completed')
                ).length;
                setPublicCompletedCount(count);
            });
        }
    }, [isOpen, me]);

    const handleBuyLicense = () => {
        if (!onTriggerPayment) return;
        onTriggerPayment(499, 'Creator License (Instant Unlock)', async () => {
            if (gameData) {
                const updated = { ...gameData, hasCreatorLicense: true };
                await DB.saveGameData(me.id, updated);
                setGameData(updated);
                showToast('Creator License unlocked! You can now host Prize Pool challenges.', 'success');
            }
        });
    };

    // Set minimum deadline date to today
    const getMinDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    // Filter autocomplete matching friends
    useEffect(() => {
        if (!tagInput.includes('@')) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const query = tagInput.split('@').pop().toLowerCase();
        const matches = friendsList.filter(f => 
            !taggedUsers.some(t => t.id === f.id) &&
            (f.name.toLowerCase().includes(query) || f.username.toLowerCase().includes(query))
        );

        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
    }, [tagInput, friendsList, taggedUsers]);

    const handleAddTag = (friend) => {
        setTaggedUsers(prev => [...prev, friend]);
        setTagInput('');
        setSuggestions([]);
        setShowSuggestions(false);
        if (tagInputRef.current) tagInputRef.current.focus();
    };

    const handleRemoveTag = (id) => {
        setTaggedUsers(prev => prev.filter(t => t.id !== id));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Backspace' && !tagInput && taggedUsers.length > 0) {
            handleRemoveTag(taggedUsers[taggedUsers.length - 1].id);
        }
    };

    const handleTagAll = () => {
        const toAdd = friendsList.filter(f => !taggedUsers.some(t => t.id === f.id));
        setTaggedUsers(prev => [...prev, ...toAdd]);
        showToast(`Tagged all ${friendsList.length} friends!`, 'success');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name.trim()) { showToast('Please enter a challenge name', 'error'); return; }
        if (!desc.trim()) { showToast('Please describe how to complete it', 'error'); return; }
        
        const isPublic = visibility === 'public';
        
        if (!isPublic && taggedUsers.length === 0) {
            showToast('Tag at least one friend, or set visibility to Public', 'error');
            return;
        }

        const targets = taggedUsers.map(u => u.id);
        const status = {};
        targets.forEach(uid => {
            status[uid] = 'pending';
        });

        const chalId = 'c' + Date.now();
        const newChal = {
            id: chalId,
            name: name.trim(),
            desc: desc.trim(),
            category,
            proofType,
            difficulty,
            deadline: deadline || null,
            isPublic,
            isHonor,
            visibility,
            creator: me.id,
            targets,
            status,
            date: new Date().toISOString().split('T')[0],
            hasPrizePool: false,
            prizePool: 0,
            winners: [],
            escrowActive: false,
            winnersLimit: 0
        };

        if (hasPrizePool) {
            if (gameData) {
                const isEligible = publicCompletedCount >= 25 || gameData.hasCreatorLicense;
                if (!isEligible) {
                    showToast(`You must complete 25 public dares (Completed: ${publicCompletedCount}/25) or buy a Creator License to host Paid challenges.`, 'error');
                    return;
                }
            }
            const amount = parseFloat(prizePoolAmount);
            if (isNaN(amount) || amount < 100) {
                showToast('Prize pool must be at least ₹100', 'error');
                return;
            }
            const commission = amount * 0.1;
            const total = amount + commission;

            // Trigger payment simulator
            onTriggerPayment(total.toFixed(2), `Prize Pool Escrow Deposit (₹${amount}) + 10% Commission (₹${commission.toFixed(2)})`, async () => {
                let exampleUrl = null;
                let exampleType = null;

                if (!isHonor) {
                    if (!exampleFile) {
                        showToast('Please upload an Example Proof video/image first.', 'error');
                        return;
                    }
                    setUploadingExample(true);
                    setExampleUploadProgress(0);
                    try {
                        const result = await Cloudinary.upload(exampleFile, 'examples', (pct) => {
                            setExampleUploadProgress(pct);
                        });
                        exampleUrl = result.url;
                        exampleType = exampleFile.type.startsWith('video/') ? 'video' : 'image';
                    } catch (err) {
                        console.error('Example upload failed:', err);
                        showToast('Failed to upload Example Proof: ' + err.message, 'error');
                        setUploadingExample(false);
                        return;
                    }
                    setUploadingExample(false);
                }

                newChal.hasPrizePool = true;
                newChal.prizePool = amount;
                newChal.platformFee = parseFloat(commission.toFixed(2));
                newChal.escrowActive = true;
                newChal.winnersLimit = winnersLimit;
                newChal.exampleUrl = exampleUrl;
                newChal.exampleType = exampleType;
                await saveChallengeToDatabase(newChal, targets, chalId);
            });
        } else {
            let exampleUrl = null;
            let exampleType = null;

            if (!isHonor) {
                if (!exampleFile) {
                    showToast('Please upload an Example Proof video/image first.', 'error');
                    return;
                }
                setUploadingExample(true);
                setExampleUploadProgress(0);
                try {
                    const result = await Cloudinary.upload(exampleFile, 'examples', (pct) => {
                        setExampleUploadProgress(pct);
                    });
                    exampleUrl = result.url;
                    exampleType = exampleFile.type.startsWith('video/') ? 'video' : 'image';
                } catch (err) {
                    console.error('Example upload failed:', err);
                    showToast('Failed to upload Example Proof: ' + err.message, 'error');
                    setUploadingExample(false);
                    return;
                }
                setUploadingExample(false);
            }

            newChal.exampleUrl = exampleUrl;
            newChal.exampleType = exampleType;
            await saveChallengeToDatabase(newChal, targets, chalId);
        }
    };

    const saveChallengeToDatabase = async (newChal, targets, chalId) => {
        try {
            // Add to database
            await DB.addChallenge(newChal);
            
            // Award XP
            await Gamification.awardCreation(me.id);
            
            // Send notifications to each target
            for (const targetId of targets) {
                const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                await DB.addNotification({
                    id: notifId,
                    to: targetId,
                    from: me.id,
                    fromName: me.name || me.username || 'Player',
                    challengeId: chalId,
                    challengeName: newChal.name,
                    type: 'challenge_sent',
                    read: false,
                    timestamp: new Date().toISOString()
                });
            }

            // Reset Form state
            setName('');
            setDesc('');
            setDeadline('');
            setTaggedUsers([]);
            setIsHonor(false);
            setHasPrizePool(false);
            setPrizePoolAmount('');
            setWinnersLimit(5);
            setVisibility('friends');
            setExampleFile(null);
            
            // Callback to refresh
            onChallengeCreated(newChal);
            showToast(`Challenge ${newChal.isPublic ? 'posted publicly' : 'sent'}!`, 'success');
            onClose();
        } catch (err) {
            console.error('Failed to create challenge:', err);
            showToast('Failed to create challenge', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-title">
                    <Sparkles /> New Challenge
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Challenge Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                            <button 
                                type="button" 
                                className={`btn ${!hasPrizePool ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => {
                                    setHasPrizePool(false);
                                    setIsHonor(false);
                                }}
                                style={{ padding: '0.75rem 1rem', height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', borderRadius: 'var(--radius-md)' }}
                            >
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>🆓 Free Challenge</span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'normal', textAlign: 'center', fontWeight: 'normal' }}>Earn XP & Dare Points</span>
                            </button>
                            <button 
                                type="button" 
                                className={`btn ${hasPrizePool ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => {
                                    setHasPrizePool(true);
                                    setIsHonor(false);
                                }}
                                style={{ padding: '0.75rem 1rem', height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', borderRadius: 'var(--radius-md)' }}
                            >
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>💰 Paid Challenge</span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'normal', textAlign: 'center', fontWeight: 'normal' }}>Escrow cash prize pool</span>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Challenge Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. 100 Push-ups in 5 mins" 
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description / How to Complete</label>
                        <textarea 
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Describe exactly how to complete this challenge..."
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Visibility</label>
                        <select 
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                        >
                            <option value="friends">Friends Only</option>
                            <option value="public">Public (Community Challenge)</option>
                        </select>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                            Public challenges are visible to everyone and proofs are voted on by the community.
                        </div>
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Send to Friends (type @ to tag)</label>
                        <div className="tag-input-wrap" onClick={() => tagInputRef.current?.focus()}>
                            {taggedUsers.map(u => (
                                <span key={u.id} className="tag-chip">
                                    @{u.username}
                                    <button type="button" onClick={() => handleRemoveTag(u.id)}><X size={12} /></button>
                                </span>
                            ))}
                            <input 
                                ref={tagInputRef}
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={taggedUsers.length === 0 ? "@username" : ""}
                                autoComplete="off"
                            />
                        </div>

                        {showSuggestions && (
                            <div className="tag-suggestions">
                                {suggestions.map(f => (
                                    <div 
                                        key={f.id} 
                                        className="tag-sug-item" 
                                        onClick={() => handleAddTag(f)}
                                    >
                                        <Avatar user={f} size="sm" />
                                        <span>{f.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {friendsList.length > 0 && (
                            <button 
                                type="button" 
                                className="btn btn-ghost btn-xs" 
                                onClick={handleTagAll}
                                style={{ marginTop: '0.5rem' }}
                            >
                                <Users size={13} style={{ marginRight: '0.2rem' }} /> Tag All Friends
                            </button>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Difficulty</label>
                        <select 
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                        >
                            <option value="easy">Easy (+10 pts)</option>
                            <option value="medium">Medium (+25 pts)</option>
                            <option value="hard">Hard (+50 pts)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Deadline (optional)</label>
                        <input 
                            type="date" 
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={getMinDate()}
                        />
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                            If set, participants must submit proof before this date or the challenge expires.
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Proof Format Required</label>
                        <select 
                            value={proofType}
                            onChange={(e) => setProofType(e.target.value)}
                        >
                            <option value="image">Image Only</option>
                            <option value="video">Video Only</option>
                            <option value="both">Image or Video</option>
                        </select>
                    </div>

                    {!isHonor && (
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                📹 Mandatory Example Proof Media <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <input 
                                type="file" 
                                accept="image/*,video/*" 
                                onChange={(e) => {
                                    const selected = e.target.files[0];
                                    if (selected) {
                                        if (selected.size > 10 * 1024 * 1024) {
                                            showToast('File too large! Max 10MB.', 'error');
                                            return;
                                        }
                                        setExampleFile(selected);
                                    }
                                }}
                                style={{ padding: '0.5rem' }}
                                required={!isHonor}
                            />
                            {exampleFile && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--green)', marginTop: '0.25rem' }}>
                                    ✓ Example selected: {exampleFile.name}
                                </div>
                            )}
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                                Acts as the visual guide for players & ground truth for the AI verification counter.
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Category</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="fitness">Fitness</option>
                            <option value="gaming">Gaming</option>
                            <option value="food">Food</option>
                            <option value="creative">Creative</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="honor">Honor</option>
                            <option value="social">Social</option>
                            <option value="education">Education</option>
                        </select>
                    </div>

                    {/* Paid Challenge Settings */}
                    {hasPrizePool && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                💸 Escrow Funding Settings
                            </div>
                            {gameData && (publicCompletedCount >= 25 || gameData.hasCreatorLicense) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Total Cash Prize Pool (₹)</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>₹</span>
                                            <input 
                                                type="number" 
                                                value={prizePoolAmount}
                                                onChange={(e) => setPrizePoolAmount(e.target.value)}
                                                placeholder="Enter pool amount (min 100)"
                                                min="100"
                                                style={{ padding: '0.5rem 0.75rem' }}
                                                required={hasPrizePool}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Number of Winners to Split</label>
                                        <select 
                                            value={winnersLimit}
                                            onChange={(e) => setWinnersLimit(parseInt(e.target.value))}
                                            style={{ padding: '0.5rem 0.75rem' }}
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                <option key={num} value={num}>
                                                    {num} {num === 1 ? 'Winner' : 'Winners'} {parseFloat(prizePoolAmount) >= 100 ? `(₹${(parseFloat(prizePoolAmount) / num).toFixed(2)} each)` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {parseFloat(prizePoolAmount) >= 100 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Prize Pool:</span>
                                                <span style={{ color: 'var(--text)' }}>₹{parseFloat(prizePoolAmount).toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>10% Platform Commission:</span>
                                                <span style={{ color: 'var(--text)' }}>₹{(parseFloat(prizePoolAmount) * 0.1).toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: 700, color: 'var(--neon)', fontSize: '0.8rem' }}>
                                                <span>Total to Pay:</span>
                                                <span>₹{(parseFloat(prizePoolAmount) * 1.1).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        🔒 Complete at least 25 public dares (Completed: {publicCompletedCount}/25) or purchase a Creator License to host cash challenges.
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn btn-ghost btn-xs"
                                        onClick={handleBuyLicense}
                                        style={{ alignSelf: 'flex-start', color: 'var(--accent)', borderColor: 'rgba(255,0,85,0.2)' }}
                                    >
                                        Instant License (₹499)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Free Challenge Options (Honor-based check) */}
                    {!hasPrizePool && (
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none' }}>
                                <input 
                                    type="checkbox" 
                                    checked={isHonor}
                                    onChange={(e) => setIsHonor(e.target.checked)}
                                    style={{ width: 'auto', accentColor: 'var(--gold)', cursor: 'pointer' }}
                                />
                                <span>Honor-based Challenge <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>(no proof upload, +5 pts on completion)</span></span>
                            </label>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploadingExample}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploadingExample}>
                            {uploadingExample ? `Uploading Example (${exampleUploadProgress}%)...` : 'Post Challenge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateChallenge;
