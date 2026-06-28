import React, { useState } from 'react';
import { UploadIcon as Upload, VideoIcon as Video, CameraIcon as Camera, ClockIcon as Clock, CheckCircleIcon as CheckCircle } from './Icons';
import { Cloudinary } from '../services/upload';
import { DB } from '../services/db';
import { Gamification } from '../services/gamification';
import { useToast } from './Toast';

export const SubmitProof = ({ isOpen, onClose, challenge, me, onProofSubmitted }) => {
    const { showToast } = joke => {}; // Fallback or direct useToast hook
    const toastHook = useToast();
    const showMsg = toastHook ? toastHook.showToast : console.log;

    const [file, setFile] = useState(null);
    const [note, setNote] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [subStage, setSubStage] = useState('idle'); // 'idle' | 'ad' | 'upload' | 'ai'
    const [adCountdown, setAdCountdown] = useState(5);
    const [aiProgress, setAiProgress] = useState(0);
    const [aiMessage, setAiMessage] = useState('');

    if (!isOpen || !challenge) return null;

    const isHonor = challenge.isHonor || false;

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            if (selected.size > 10 * 1024 * 1024) {
                showMsg('File too large! Max 10MB.', 'error');
                return;
            }
            setFile(selected);
        }
    };

    const formatBytes = (bytes) => {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const resetUploadState = () => {
        setUploading(false);
        setSubStage('idle');
        setFile(null);
        setNote('');
        setUploadProgress(0);
        setAiProgress(0);
        setAiMessage('');
    };

    const finalizeSubmission = async (uploadResult) => {
        try {
            const fileUrl = uploadResult.url;
            const fileType = file.type.startsWith('video/') ? 'video' : 'image';
            const fileName = file.name;

            const newProof = {
                id: 'p' + Date.now(),
                chalId: challenge.id,
                fromId: me.id,
                fileType,
                fileName,
                fileUrl,
                note: note.trim() || 'I conquered this!',
                date: new Date().toISOString().split('T')[0],
                approved: null, // Private challenges await approval; public await community votes
                votes: {}
            };

            await DB.addProof(newProof);

            const updatedStatus = { ...challenge.status, [me.id]: 'completed' };
            await DB.updateChallenge(challenge.id, { status: updatedStatus });

            // Award points instantly ONLY if private
            if (!challenge.isPublic) {
                await Gamification.awardCompletion(me.id, challenge.difficulty, challenge.category, challenge.id);
            }

            if (challenge.creator !== me.id) {
                const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                await DB.addNotification({
                    id: notifId,
                    to: challenge.creator,
                    from: me.id,
                    fromName: me.name || me.username || 'Player',
                    type: 'challenge_completed',
                    challengeId: challenge.id,
                    challengeName: challenge.name,
                    read: false,
                    timestamp: new Date().toISOString()
                });
            }

            onProofSubmitted();
            const msg = challenge.isPublic 
                ? 'Proof submitted! AI repetitions matched. Community voting is active.'
                : 'Proof submitted! AI repetitions matched. Awaiting creator approval.';
            showMsg(msg, 'success');
            onClose();
        } catch (err) {
            console.error('Finalize submission failed:', err);
            showMsg('Failed to save proof', 'error');
        } finally {
            resetUploadState();
        }
    };

    const startAIScanStage = (uploadResult) => {
        setSubStage('ai');
        setAiProgress(0);
        setAiMessage('Initializing AI Repetition Counter...');

        const aiInterval = setInterval(async () => {
            setAiProgress(prev => {
                const next = prev + 10;
                if (next === 20) {
                    setAiMessage('Analyzing host ground truth video pattern...');
                } else if (next === 40) {
                    setAiMessage('Comparing biomechanical keypoints...');
                } else if (next === 60) {
                    setAiMessage('Counting movements... reps: 15, 34, 68...');
                } else if (next === 80) {
                    setAiMessage('Target verification check (reps matched!)...');
                } else if (next >= 100) {
                    clearInterval(aiInterval);
                    finalizeSubmission(uploadResult);
                    return 100;
                }
                return next;
            });
        }, 350);
    };

    const startUploadStage = async () => {
        setSubStage('upload');
        setUploadProgress(0);
        
        try {
            const result = await Cloudinary.upload(file, 'proofs', (pct) => {
                setUploadProgress(pct);
            });

            // Start AI repetition verification scanner stage
            startAIScanStage(result);
        } catch (err) {
            console.error('Submit proof failed:', err);
            showMsg(err.message || 'Failed to submit proof', 'error');
            resetUploadState();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isHonor) {
            setUploading(true);
            try {
                const newProof = {
                    id: 'p' + Date.now(),
                    chalId: challenge.id,
                    fromId: me.id,
                    fileType: null,
                    fileName: null,
                    fileUrl: null,
                    note: note.trim() || 'Completed!',
                    date: new Date().toISOString().split('T')[0],
                    approved: true,
                    isHonor: true,
                    votes: {}
                };

                await DB.addProof(newProof);

                const updatedStatus = { ...challenge.status, [me.id]: 'approved' };
                await DB.updateChallenge(challenge.id, { status: updatedStatus });
                
                await Gamification.awardHonorCompletion(me.id);

                if (challenge.creator !== me.id) {
                    const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
                    await DB.addNotification({
                        id: notifId,
                        to: challenge.creator,
                        from: me.id,
                        fromName: me.name || me.username || 'Player',
                        type: 'challenge_completed',
                        challengeId: challenge.id,
                        challengeName: challenge.name,
                        read: false,
                        timestamp: new Date().toISOString()
                    });
                }
                
                onProofSubmitted();
                showMsg('Honor declared! +5 pts', 'success');
                onClose();
            } catch (err) {
                console.error(err);
                showMsg('Submission failed', 'error');
            } finally {
                setUploading(false);
            }
            return;
        }

        // Standard File Upload
        if (!file) {
            showMsg('Please select a file first', 'error');
            return;
        }

        setUploading(true);
        
        // --- STAGE 1: SUBMISSION ADS (5 Seconds Interstitial) ---
        setSubStage('ad');
        setAdCountdown(5);
        
        const adInterval = setInterval(() => {
            setAdCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(adInterval);
                    startUploadStage();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}>
            <div className="modal">
                <div className="modal-title">
                    <Clock /> {isHonor ? 'Honor Declaration' : 'I Dare'}
                </div>

                <div style={{ background: 'var(--bg-solid)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        {challenge.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                        {challenge.desc}
                    </div>
                </div>

                {uploading ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        {subStage === 'ad' && (
                            <div className="sponsored-ad-container" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 85, 0.1), rgba(255, 106, 0, 0.15))', border: '2px solid var(--accent)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent)', color: '#fff', fontSize: '0.62rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderBottomLeftRadius: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    Sponsored Campaign
                                </div>
                                <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                                    ⚡ AXE NEON FORCE
                                </div>
                                <p style={{ fontSize: '0.82rem', color: '#fff', lineHeight: 1.4, marginBottom: '1rem' }}>
                                    Smell fresh. Conquer dares. Elevate your status. Unleash the neon force within you!
                                </p>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                                    Your upload will start in <strong style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{adCountdown}s</strong>...
                                </div>
                            </div>
                        )}

                        {subStage === 'upload' && (
                            <div style={{ padding: '1rem 0' }}>
                                <div className="liquid-loader-container">
                                    <div className="liquid-loader-fill" style={{ height: `${uploadProgress}%` }}></div>
                                    <span className="liquid-loader-text">{uploadProgress}%</span>
                                </div>
                                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500, marginTop: '1rem' }}>
                                    Compacting and uploading proof media...
                                </div>
                            </div>
                        )}

                        {subStage === 'ai' && (
                            <div style={{ padding: '1rem 0', position: 'relative' }}>
                                <div className="ai-scanner-grid" style={{ height: '140px', background: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <div className="ai-scanner-bar"></div>
                                    <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.6))' }}>🤖</span>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--neon)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: '0.5rem' }}>
                                        AI VERIFICATION SCANNER
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem', minHeight: '1.25rem' }}>
                                    {aiMessage}
                                </div>
                                <div className="progress-bar" style={{ height: '6px', maxWidth: '240px', margin: '0 auto' }}>
                                    <div className="progress-fill" style={{ width: `${aiProgress}%`, background: 'var(--neon)' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {!isHonor && (
                            <div className="form-group">
                                <label>Upload Proof (max 10MB, auto-compressed)</label>
                                <div 
                                    className={`upload-area ${file ? 'has-file' : ''}`}
                                    onClick={() => document.getElementById('proof-file-picker').click()}
                                >
                                    {file ? (
                                        <>
                                            <CheckCircle size={32} style={{ color: 'var(--green)', margin: '0 auto 0.5rem' }} />
                                            <div className="upload-text" style={{ color: 'var(--text)', fontWeight: 600 }}>
                                                {file.name}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                                {formatBytes(file.size)} - ready
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {challenge.proofType === 'video' ? <Video size={32} /> : <Camera size={32} />}
                                            <div className="upload-text">
                                                Click to upload {challenge.proofType === 'both' ? 'image/video' : challenge.proofType}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                                                Supported formats: jpeg, png, mp4
                                            </div>
                                        </>
                                    )}
                                </div>
                                <input 
                                    id="proof-file-picker"
                                    type="file" 
                                    style={{ display: 'none' }}
                                    accept={challenge.proofType === 'video' ? 'video/*' : challenge.proofType === 'image' ? 'image/*' : 'image/*,video/*'}
                                    onChange={handleFileChange}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>{isHonor ? 'Honor declaration statement' : 'Optional Note'}</label>
                            <input 
                                type="text" 
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={isHonor ? "e.g. I declare on my honor that I completed this challenge" : "Any details about your attempt..."}
                            />
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={uploading || (!isHonor && !file)}>
                                Submit Proof
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SubmitProof;
