
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../ui/Icons';
import { Avatar } from '../ui/Avatar';

interface ProfileProps {
    onSignOut: () => void;
    onBack: () => void;
}

const dataMenu = [
    { title: "Comunity", icon: "comunity" },
    { title: "Status", icon: "status" },
    { title: "Message", icon: "newMessage" },
    { title: "Saluran", icon: "saluran" },
    { title: "Setting", icon: "setting" },
];

export const Profile: React.FC<ProfileProps> = ({ onSignOut, onBack }) => {
    const [activeMenu, setActiveMenu] = useState(-1);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setActiveMenu(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMenuClick = (index: number, title: string) => {
        const newActive = index === activeMenu ? -1 : index;
        setActiveMenu(newActive);
        if (title === "Setting") {
            setIsMenuOpen(newActive !== -1);
        } else {
            setIsMenuOpen(false);
        }
    };

    return (
        <div className="bg-color2 flex-shrink-0">
            <div className="mx-2 flex items-center justify-between p-2">
                <button onClick={onBack}>
                    <Avatar name="Flowtiva Admin" className="h-10 w-10" />
                </button>
                <div className="relative flex flex-row justify-around gap-3">
                    {dataMenu.map((list, index) => (
                        <button
                            key={index}
                            onClick={() => handleMenuClick(index, list.title)}
                            className={`${index === activeMenu ? "ActiveButton" : "noActiveButton"} text-color12 hover:text-color16`}
                            aria-label={list.title}
                        >
                            <Icons.Icon id={list.icon} className="w-6 h-6" />
                        </button>
                    ))}
                    {isMenuOpen && activeMenu === dataMenu.findIndex(i => i.title === 'Setting') && (
                        <div
                            ref={menuRef}
                            className="bg-color8 text-color16 absolute right-0 top-full mt-2 z-30 flex w-48 flex-col gap-1 rounded p-2 shadow-lg animate-in fade-in-0 zoom-in-95"
                        >
                            <a href="#" className="px-2 py-1.5 text-sm hover:bg-color18 rounded">New Group</a>
                            <a href="#" className="px-2 py-1.5 text-sm hover:bg-color18 rounded">New Community</a>
                            <a href="#" className="px-2 py-1.5 text-sm hover:bg-color18 rounded">Starred Messages</a>
                            <a href="#" className="px-2 py-1.5 text-sm hover:bg-color18 rounded">Settings</a>
                            <button onClick={onSignOut} className="w-full text-left px-2 py-1.5 text-sm hover:bg-color18 rounded">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};