import React from 'react';

interface AvatarProps {
  name: string; // Used as seed
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, className = '' }) => {
  const avatarUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodeURIComponent(name || 'default')}`;

  return (
    <div className={`flex-shrink-0 rounded-full bg-brand-border overflow-hidden ${className}`}>
        <img src={avatarUrl} alt={name || 'Avatar'} className="w-full h-full object-cover" />
    </div>
  );
};
