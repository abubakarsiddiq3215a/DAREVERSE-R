import React, { useState, useEffect, useRef } from 'react';
import { Auth } from '../services/auth';
import { useToast } from '../components/Toast';
import { SparklesIcon as Sparkles, ArrowRightIcon as ArrowRight, UserPlusIcon as UserPlus, InfoIcon as Info } from '../components/Icons';
import gsap from 'gsap';

export const Login = ({ onLoginSuccess }) => {
    const { showToast } = useToast();
    const cardRef = useRef(null);

    const [isRegister, setIsRegister] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Sign In inputs
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Sign Up inputs
    const [regName, setRegName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');

    // GSAP Entrance
    useEffect(() => {
        gsap.fromTo(cardRef.current, 
            { opacity: 0, scale: 0.94, y: 25 },
            { opacity: 1, scale: 1, y: 0, duration: 0.65, ease: 'power3.out' }
        );
    }, [isRegister]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');

        try {
            const result = await Auth.login(loginUsername, loginPassword);
            if (result.success) {
                showToast('Welcome back, conqueror!', 'success');
                onLoginSuccess();
            } else {
                setErrorMsg(result.error);
                showToast(result.error, 'error');
            }
        } catch (err) {
            console.error('Login submit error:', err);
            setErrorMsg('Connection failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');

        const usernameRegex = /^[a-zA-Z0-9_\.]+$/;
        if (!usernameRegex.test(regUsername)) {
            setErrorMsg("Username can only contain letters, numbers, underscores, and periods.");
            showToast("Invalid username characters", "error");
            setSubmitting(false);
            return;
        }

        try {
            const result = await Auth.register(regUsername, regPassword, regName);
            if (result.success) {
                showToast('Welcome to DareVerse!', 'success');
                onLoginSuccess();
            } else {
                setErrorMsg(result.error);
                showToast(result.error, 'error');
            }
        } catch (err) {
            console.error('Registration submit error:', err);
            setErrorMsg('Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-page" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Mesh shifting background wrapper */}
            <div className="space-bg" />

            <div className="login-container" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
                <div 
                    ref={cardRef} 
                    className="login-card" 
                    style={{ background: 'rgba(10, 10, 16, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: '18px', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}
                >
                    <div className="login-logo" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '3rem', letterSpacing: '-1.5px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>
                            DAREVERSE
                        </h1>
                        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                            Challenge friends. Prove skills. Rise up.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="login-error show" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 51, 51, 0.1)', border: '1px solid rgba(255, 51, 51, 0.2)', borderRadius: '8px', padding: '0.6rem 0.9rem', color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                            <Info size={16} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {!isRegister ? (
                        /* Sign In Form */
                        <form className="login-form" onSubmit={handleLoginSubmit}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>Username or Email</label>
                                <input 
                                    type="text" 
                                    value={loginUsername}
                                    onChange={(e) => setLoginUsername(e.target.value)}
                                    placeholder="Enter your username or email" 
                                    autoComplete="username" 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>Password</label>
                                <input 
                                    type="password" 
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="Enter password" 
                                    autoComplete="current-password" 
                                    required 
                                    minLength={6}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="login-btn" 
                                disabled={submitting}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {submitting ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
                            </button>
                            
                            <div className="login-footer" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                Don't have an account?{' '}
                                <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setIsRegister(true); setErrorMsg(''); }}
                                    style={{ fontWeight: 600, color: 'var(--accent)' }}
                                >
                                    Sign Up
                                </a>
                            </div>
                        </form>
                    ) : (
                        /* Sign Up Form */
                        <form className="login-form" onSubmit={handleRegisterSubmit}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>Full Name</label>
                                <input 
                                    type="text" 
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    placeholder="Enter your full name" 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>Username</label>
                                <input 
                                    type="text" 
                                    value={regUsername}
                                    onChange={(e) => setRegUsername(e.target.value)}
                                    placeholder="Choose a username" 
                                    autoComplete="username" 
                                    required 
                                    pattern="^[a-zA-Z0-9_\.]+$"
                                    title="Username can only contain letters, numbers, underscores, and periods (no spaces)."
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>Password</label>
                                <input 
                                    type="password" 
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    placeholder="Create password (min 6 chars)" 
                                    autoComplete="new-password" 
                                    required 
                                    minLength={6}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="login-btn" 
                                disabled={submitting}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {submitting ? 'Creating account...' : 'Create Account'} <UserPlus size={16} />
                            </button>

                            <div className="login-footer" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                Already have an account?{' '}
                                <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setIsRegister(false); setErrorMsg(''); }}
                                    style={{ fontWeight: 600, color: 'var(--accent)' }}
                                >
                                    Sign In
                                </a>
                            </div>
                        </form>
                    )}

                    <div className="demo-hint" style={{ marginTop: '1.5rem', background: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.12)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--neon)', textAlign: 'center', lineHeight: 1.4 }}>
                        💡 <strong>Quick Demo access</strong><br />
                        Sign in using <code>testuser</code> / <code>password</code>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
