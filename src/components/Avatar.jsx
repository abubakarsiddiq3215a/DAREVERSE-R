import React from 'react';
import { DB } from '../services/db';

export const Avatar = ({ user, isMe = false, size = '' }) => {
    if (!user) {
        const sizeClass = size ? ` ${size}` : '';
        return (
            <div className={`avatar friend${sizeClass}`}>?</div>
        );
    }

    const sizeClass = size ? ` ${size}` : '';
    const colorClass = isMe ? 'me' : 'friend';
    const initials = user.initials || DB.getInitials(user.name || '?');

    if (user.profileImage) {
        return (
            <div className={`avatar ${colorClass}${sizeClass}`} style={{ padding: 0, overflow: 'hidden' }}>
                <img 
                    src={user.profileImage} 
                    alt={user.name || ''} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                />
            </div>
        );
    }

    return (
        <div className={`avatar ${colorClass}${sizeClass}`}>
            {initials}
        </div>
    );
};

export default Avatar;
