import React from 'react';
import { HomeIcon as Home, ZapIcon as Zap, UsersIcon as Users, InboxIcon as Inbox, TrophyIcon as Trophy, UserIcon as User, ShieldIcon as Shield, HelpCircleIcon as HelpCircle, BellIcon as Bell } from './Icons';
import Avatar from './Avatar';

export const Navbar = ({ 
    currentPage, 
    setCurrentPage, 
    me, 
    unreadCount = 0, 
    pendingProofsCount = 0, 
    pendingRequestsCount = 0, 
    onToggleNotifications, 
    onOpenHelp,
    isAdmin = false,
    onOpenAdmin
}) => {
    return (
        <>
            {/* Desktop Header */}
            <header>
                <div className="logo" onClick={() => setCurrentPage('feed')}>
                    DAREVERSE
                </div>
                
                <nav>
                    <button 
                        className={currentPage === 'feed' ? 'active' : ''} 
                        onClick={() => setCurrentPage('feed')}
                    >
                        <Home /> <span>Feed</span>
                    </button>
                    
                    <button 
                        className={currentPage === 'challenges' ? 'active' : ''} 
                        onClick={() => setCurrentPage('challenges')}
                    >
                        <Zap /> <span>Challenges</span>
                    </button>
                    
                    <button 
                        className={currentPage === 'friends' ? 'active' : ''} 
                        onClick={() => setCurrentPage('friends')}
                    >
                        <Users /> <span>Friends</span>
                        {pendingRequestsCount > 0 && <span className="notif-dot" />}
                    </button>
                    
                    <button 
                        className={currentPage === 'proofs' ? 'active' : ''} 
                        onClick={() => setCurrentPage('proofs')}
                    >
                        <Inbox /> <span>Inbox</span>
                        {pendingProofsCount > 0 && <span className="notif-dot" />}
                    </button>
                    
                    <button 
                        className={currentPage === 'leaderboard' ? 'active' : ''} 
                        onClick={() => setCurrentPage('leaderboard')}
                    >
                        <Trophy /> <span>Ranks</span>
                    </button>
                    
                    <button 
                        className={currentPage === 'profile' ? 'active' : ''} 
                        onClick={() => setCurrentPage('profile')}
                    >
                        <User /> <span>Profile</span>
                    </button>
                </nav>
                
                <div className="header-actions">
                    {isAdmin && (
                        <button 
                            className="notif-bell" 
                            onClick={onOpenAdmin}
                            title="Admin Dashboard"
                        >
                            <Shield style={{ width: 20, height: 20 }} />
                        </button>
                    )}
                    
                    <button 
                        className="notif-bell" 
                        onClick={onOpenHelp}
                        title="Help & Rules"
                    >
                        <HelpCircle style={{ width: 20, height: 20 }} />
                    </button>
                    
                    <button 
                        className="notif-bell" 
                        onClick={onToggleNotifications}
                        title="Notifications"
                        style={{ position: 'relative' }}
                    >
                        <Bell style={{ width: 20, height: 20 }} />
                        {unreadCount > 0 && (
                            <span className="notif-badge">{unreadCount}</span>
                        )}
                    </button>
                    
                    <div 
                        className="user-badge" 
                        onClick={() => setCurrentPage('profile')}
                    >
                        <Avatar user={me} isMe={true} />
                        <span className="user-name-text" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {me?.name ? me.name.split(' ')[0] : 'Player'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <div className="bottom-nav">
                <div className="bottom-nav-inner">
                    <button 
                        className={currentPage === 'feed' ? 'active' : ''} 
                        onClick={() => setCurrentPage('feed')}
                    >
                        <Home />
                        <span>Feed</span>
                    </button>
                    
                    <button 
                        className={currentPage === 'challenges' ? 'active' : ''} 
                        onClick={() => setCurrentPage('challenges')}
                    >
                        <Zap />
                        <span>Dares</span>
                    </button>
                    
                    <button 
                        className={currentPage === 'friends' ? 'active' : ''} 
                        onClick={() => setCurrentPage('friends')}
                    >
                        <Users />
                        <span>Friends</span>
                        {pendingRequestsCount > 0 && <span className="mob-notif" />}
                    </button>
                    
                    <button 
                        className={currentPage === 'leaderboard' ? 'active' : ''} 
                        onClick={() => setCurrentPage('leaderboard')}
                    >
                        <Trophy />
                        <span>Ranks</span>
                    </button>
                    
                    <button 
                        className={currentPage === 'profile' ? 'active' : ''} 
                        onClick={() => setCurrentPage('profile')}
                    >
                        <User />
                        <span>Profile</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Navbar;
