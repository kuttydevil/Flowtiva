
import React, { useState, useEffect } from 'react';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

// --- Icons & Assets ---

const CheckDoubleIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 16 11" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.75 1.5L5.25 7L3.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.75 1.5L9.25 7L8.5 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const BrainCircuitIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M15 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-7.707 3.293a1 1 0 1 0-1.414 1.414 1 1 0 0 0 1.414-1.414ZM4 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.293 4.293a1 1 0 1 0-1.414 1.414 1 1 0 0 0 1.414-1.414ZM12 18a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm4.707-1.293a1 1 0 1 0-1.414 1.414 1 1 0 0 0 1.414-1.414ZM19 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-1.293-4.707a1 1 0 1 0-1.414 1.414 1 1 0 0 0 1.414-1.414Z"/>
        <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm-2 3a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm2 3a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm3-2a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd" opacity="0.3"/>
    </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 29C23.1797 29 29 23.1797 29 16C29 8.8203 23.1797 3 16 3C8.8203 3 3 8.8203 3 16C3 18.349 3.5937 20.551 4.6468 22.484L3.193 27.807L8.625 26.375C10.669 27.994 13.218 29 16 29Z" fill="#25D366"/>
        <path d="M22.5 19.5C22.25 20.5 21 21.5 20 21.6C19.3 21.7 18.5 21.8 15.5 20.5C12.5 19.2 10.5 16.2 10.4 16C10.3 15.8 9.2 14.5 9.2 13.1C9.2 11.7 9.9 11 10.2 10.7C10.5 10.4 10.8 10.4 11.1 10.4C11.4 10.4 11.6 10.4 11.8 10.5C12.1 10.5 12.3 10.2 12.6 11C12.9 11.7 13.2 12.5 13.3 12.6C13.4 12.8 13.4 13 13.2 13.2C13.1 13.4 13 13.6 12.8 13.8C12.6 14 12.4 14.1 12.7 14.6C12.9 15 13.7 16.3 14.9 17.3C16.4 18.7 17.6 19.1 18 19.3C18.4 19.5 18.6 19.5 18.9 19.2C19.1 18.9 19.5 18.4 19.8 17.9C20.1 17.5 20.4 17.6 20.7 17.7C21 17.8 22.6 18.6 23 18.8C23.3 19 23.5 19.1 23.6 19.2C23.7 19.3 23.7 19.8 22.5 19.5Z" fill="white"/>
    </svg>
);

// iPhone Specific Icons
const IOSBatteryIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 12" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.4"/>
        <path d="M22.5 4.5C23.0523 4.5 23.5 4.94772 23.5 5.5V6.5C23.5 7.05228 23.0523 7.5 22.5 7.5V4.5Z" fill="currentColor" fillOpacity="0.4"/>
        <rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor"/>
    </svg>
);

const IOSWifiIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 20 16" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M10.0001 3.96637C13.2384 3.96637 16.182 5.1783 18.4907 7.18524L19.2801 6.39801C16.8206 4.26042 13.6062 2.91637 10.0001 2.91637C6.39391 2.91637 3.17953 4.26042 0.719971 6.39801L1.50942 7.18524C3.81816 5.1783 6.76176 3.96637 10.0001 3.96637ZM10.0001 7.11637C12.3995 7.11637 14.5807 8.01407 16.2915 9.49987L17.0809 8.71264C15.2193 7.09559 12.7661 6.06637 10.0001 6.06637C7.234 6.06637 4.78083 7.09559 2.91919 8.71264L3.70864 9.49987C5.41943 8.01407 7.60064 7.11637 10.0001 7.11637ZM10.0001 10.2664C11.4566 10.2664 12.7806 10.8114 13.8188 11.7132L14.6083 10.926C13.4172 9.89163 11.8398 9.21637 10.0001 9.21637C8.16035 9.21637 6.5829 9.89163 5.39185 10.926L6.1813 11.7132C7.21953 10.8114 8.54353 10.2664 10.0001 10.2664ZM10.0001 15.5414L11.5834 13.9625C11.1719 13.6051 10.6277 13.3164 10.0001 13.3164C9.37243 13.3164 8.82823 13.6051 8.41675 13.9625L10.0001 15.5414Z"/>
    </svg>
);

const IOSSignalIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 20 12" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="7.5" width="3" height="4" rx="1"/>
        <rect x="6.5" y="5" width="3" height="6.5" rx="1"/>
        <rect x="11.5" y="2.5" width="3" height="9" rx="1"/>
        <rect x="16.5" width="3" height="11.5" rx="1"/>
    </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M15 19l-7-7 7-7" />
    </svg>
);

const VideoIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2.11 2 12.05 12.05 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.03 12.03 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const CameraIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
    </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
);

const StickerIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
    </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
    </svg>
);

const InstagramGradientIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z" fill="currentColor"/>
        <path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="currentColor"/>
        <path d="M20.27 4.54a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" fill="currentColor"/>
    </svg>
);

// --- Types ---

type DemoStep = 
  | 'idle' 
  | 'user_typing' 
  | 'msg_sent' 
  | 'ai_processing' 
  | 'crm_updating' 
  | 'ai_typing' 
  | 'ai_reply' 
  | 'complete';

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    time?: string;
    status: 'sent' | 'delivered' | 'read';
}

// --- Component ---

export const InteractiveDemo: React.FC = () => {
    const { t } = useTranslation();
    const [step, setStep] = useState<DemoStep>('idle');
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [crmData, setCrmData] = useState({ name: '', intent: '', stage: '', tag: '' });
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram'>('whatsapp');

    // Sales Conversation Config (Shared base)
    const baseMessages = [
        { id: 'h1', sender: 'ai', text: 'Marhaba Fatima! 👋 Welcome to Flowtiva Motors. How can I help you today?', time: '10:00', status: 'read' },
        { id: 'h2', sender: 'user', text: 'Hi, I\'m interested in the new SUV model. Is it in stock?', time: '10:05', status: 'read' },
        { id: 'h3', sender: 'ai', text: 'Yes, we have the 2025 model in White and Black. Would you like to book a test drive?', time: '10:06', status: 'read' },
        { id: 'h4', sender: 'user', text: 'Maybe later. What\'s the price range?', time: '10:10', status: 'read' },
        { id: 'h5', sender: 'ai', text: 'It starts at QAR 180,000. We have a special offer with 0% down payment.', time: '10:11', status: 'read' },
    ];

    const config = {
        user: { name: 'Fatima Al-Sayed', avatar: 'Fatima' },
        msg: "That's a good deal. Can we schedule a test drive for tomorrow at 4 PM?",
        reply: "Absolutely! I've booked you for tomorrow at 4 PM. I'll send the location now. 📍",
        crm: { name: 'Fatima Al-Sayed', intent: 'Test Drive', stage: 'Qualified', tag: 'Hot Lead' }
    };

    // Animation Sequencer
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const sequence = async () => {
            // Reset state
            setChat(baseMessages as ChatMessage[]);
            setCrmData({ name: '', intent: '', stage: '', tag: '' });
            setStep('idle');
            
            await new Promise(r => { timer = setTimeout(r, 800); });
            setStep('user_typing');
            
            await new Promise(r => { timer = setTimeout(r, 1500); });
            // User sends message
            const userMsgTime = '10:15';
            setChat(prev => [...prev, { id: 'new_1', sender: 'user', text: config.msg, time: userMsgTime, status: 'sent' }]);
            setStep('msg_sent');

            await new Promise(r => { timer = setTimeout(r, 800); });
            setStep('ai_processing'); 

            await new Promise(r => { timer = setTimeout(r, 1000); });
            setStep('crm_updating');
            
            // CRM Populates
            setCrmData(prev => ({ ...prev, name: config.crm.name }));
            await new Promise(r => { timer = setTimeout(r, 400); });
            setCrmData(prev => ({ ...prev, intent: config.crm.intent }));
            await new Promise(r => { timer = setTimeout(r, 400); });
            setCrmData(prev => ({ ...prev, stage: config.crm.stage }));
            await new Promise(r => { timer = setTimeout(r, 400); });
            setCrmData(prev => ({ ...prev, tag: config.crm.tag }));

            await new Promise(r => { timer = setTimeout(r, 600); });
            setStep('ai_typing');
            
            await new Promise(r => { timer = setTimeout(r, 1800); });
            // AI Replies
            const replyTime = '10:16';
            setChat(prev => [
                ...prev.slice(0, -1),
                { ...prev[prev.length - 1], status: 'read' }, // Mark user msg as read
                { id: 'new_2', sender: 'ai', text: config.reply, time: replyTime, status: 'read' }
            ]);
            setStep('ai_reply');

            await new Promise(r => { timer = setTimeout(r, 4000); });
            setStep('complete'); 
        };

        sequence();
        return () => clearTimeout(timer);
    }, [activeTab]); // Restart sequence on tab change

    const isWhatsApp = activeTab === 'whatsapp';
    
    // BUSINESS VIEW LOGIC:
    // User (Customer) is Incoming (Left).
    // AI (Agent) is Outgoing (Right).
    
    return (
        <div className="w-full flex flex-col items-center">
            <style>{`
                /* iPhone 12 CSS Recreation */
                .iphone-chassis {
                    width: 320px;
                    height: 640px;
                    border-radius: 45px;
                    position: relative;
                    transition: ease all 0.5s;
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
                }
                .iphone-border {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    align-content: center;
                    height: 100%;
                    width: 100%;
                    background-color: #152839;
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    box-shadow: inset 0 0 3px 1px #fff;
                    border-radius: 45px;
                    position: relative;
                }
                /* Antenna Bands */
                .iphone-border:before, .iphone-border:after {
                    content: "";
                    position: absolute;
                    top: 65px;
                    background-color: rgba(255, 255, 255, 0.1);
                    width: 7px;
                    height: 6px;
                    z-index: 1;
                }
                .iphone-border:before { left: 0px; }
                .iphone-border:after { right: 0px; }
                
                .iphone-buttons:before, .iphone-buttons:after {
                    content: "";
                    position: absolute;
                    bottom: 65px;
                    background-color: rgba(255, 255, 255, 0.1);
                    width: 7px;
                    height: 6px;
                    z-index: 1;
                }
                .iphone-buttons:before { left: 0px; }
                .iphone-buttons:after { right: 0px; }

                /* Buttons */
                .iphone-buttons > * {
                    position: absolute;
                    left: -3px;
                    width: 3px;
                    background: linear-gradient(90deg, transparent, #152839);
                    border-radius: 20px 10px 10px 20px;
                }
                .iphone-buttons .btn-power {
                    top: 160px;
                    right: -3px;
                    left: auto;
                    height: 80px;
                    background: linear-gradient(90deg, #152839, transparent);
                    border-radius: 10px 20px 20px 10px;
                }
                .iphone-buttons .btn-switch {
                    top: 100px;
                    height: 25px;
                }
                .iphone-buttons .btn-vol-up {
                    top: 150px;
                    height: 45px;
                }
                .iphone-buttons .btn-vol-down {
                    top: 210px;
                    height: 45px;
                }

                /* Inner Bezel */
                .iphone-bezel {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    align-content: center;
                    width: calc(100% - 14px);
                    height: calc(100% - 14px);
                    border-radius: 40px;
                    background-color: #000;
                    position: relative;
                    overflow: hidden;
                }
                .iphone-bezel:after {
                    content: "";
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 40px;
                    border: 7px solid #000;
                    box-sizing: border-box;
                    pointer-events: none;
                    z-index: 100;
                }

                /* Notch */
                .iphone-notch {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    align-content: center;
                    position: absolute;
                    top: 0;
                    width: 150px;
                    height: 32px;
                    border-bottom-left-radius: 17px;
                    border-bottom-right-radius: 17px;
                    background-color: #000;
                    z-index: 100;
                }
                .iphone-notch:before, .iphone-notch:after {
                    content: "";
                    position: absolute;
                    top: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 7px solid transparent;
                }
                .iphone-notch:before {
                    left: -17px;
                    border-right-color: #000;
                    transform: rotate(-50deg);
                }
                .iphone-notch:after {
                    right: -17px;
                    border-left-color: #000;
                    transform: rotate(50deg);
                }
                .iphone-speaker {
                    width: 40px;
                    height: 4px;
                    border-radius: 20px;
                    background-color: #1b1b1b;
                    border: 0.7px solid #171717;
                    box-shadow: inset 0px -0.3px 1px 0px #8c8c8c;
                    margin-right: 15px;
                }
                .iphone-camera {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background-color: #1b1b1b;
                    position: relative;
                }
                .iphone-camera:before {
                    content: "";
                    position: absolute;
                    width: calc(100% - 4px);
                    height: calc(100% - 4px);
                    background: radial-gradient(#000, #152839 60%);
                    border-radius: 50%;
                    top: 2px; left: 2px;
                }
                .iphone-camera:after {
                    content: "";
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    top: 4px; right: 4px;
                }

                /* Screen */
                .iphone-screen {
                    width: calc(100% - 14px);
                    height: calc(100% - 14px);
                    border-radius: 32px;
                    background-color: #fff;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                /* WhatsApp Specific Bubble Tails */
                .wa-bubble-tail-in::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: -9px;
                    width: 13px;
                    height: 13px;
                    background: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 13 13' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0V13C0 13 2.5 8 9 0H0Z' fill='white'/%3E%3C/svg%3E") no-repeat;
                }
                .wa-bubble-tail-out::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    right: -9px;
                    width: 13px;
                    height: 13px;
                    background: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 13 13' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13 0V13C13 13 10.5 8 4 0H13Z' fill='%23E1FCD7'/%3E%3C/svg%3E") no-repeat;
                }
                
                /* Custom Scrollbar for Demo */
                .demo-scrollbar::-webkit-scrollbar { width: 3px; }
                .demo-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
            
            {/* The Stage */}
            <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24 mt-8">
                
                {/* Platform Switcher */}
                <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 flex items-center bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 z-20">
                    <button
                        onClick={() => setActiveTab('whatsapp')}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                            activeTab === 'whatsapp' ? "bg-white text-black shadow-md" : "text-white hover:bg-white/10"
                        )}
                    >
                        <WhatsAppIcon className={cn("w-4 h-4", activeTab === 'whatsapp' ? "text-[#25D366]" : "fill-current")} />
                        Whatsapp
                    </button>
                    <button
                        onClick={() => setActiveTab('instagram')}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                            activeTab === 'instagram' ? "bg-white text-black shadow-md" : "text-white hover:bg-white/10"
                        )}
                    >
                        <InstagramGradientIcon className={cn("w-4 h-4", activeTab === 'instagram' ? "" : "grayscale")} />
                        Instagram
                    </button>
                </div>

                {/* 1. PHONE MOCKUP */}
                <div className="iphone-chassis group perspective-1000">
                    <div className="iphone-border">
                        <div className="iphone-buttons">
                            <div className="btn-switch"></div>
                            <div className="btn-vol-up"></div>
                            <div className="btn-vol-down"></div>
                            <div className="btn-power"></div>
                        </div>
                        <div className="iphone-bezel">
                            <div className="iphone-notch">
                                <div className="iphone-speaker"></div>
                                <div className="iphone-camera"></div>
                            </div>
                            
                            <div className={cn("iphone-screen transition-colors duration-500", isWhatsApp ? "bg-[#E5DDD5]" : "bg-white")}>
                                {/* Status Bar */}
                                <div className={cn("absolute top-0 left-0 w-full h-[44px] px-6 flex justify-between items-center text-[13px] font-semibold z-50 select-none", "text-black")}>
                                    <span className="translate-y-1 ml-2">10:15</span>
                                    <div className="flex gap-1.5 items-center translate-y-1 opacity-90 mr-1">
                                        <IOSSignalIcon className="w-[18px] h-[12px]" />
                                        <IOSWifiIcon className="w-[16px] h-[12px]" />
                                        <IOSBatteryIcon className="w-[24px] h-[12px]" />
                                    </div>
                                </div>

                                {/* App Header */}
                                <div className={cn("h-[95px] pt-[45px] pb-2 px-1 flex items-center z-30 relative shadow-sm transition-colors duration-300", isWhatsApp ? "bg-[#F6F6F6]/90 border-b border-[#B2B2B2]/30" : "bg-white border-b border-gray-100")}>
                                    <button className={cn("flex items-center -ml-1", isWhatsApp ? "text-[#007AFF]" : "text-black")}>
                                        <ChevronLeftIcon className="w-8 h-8" />
                                        {isWhatsApp && <span className="text-[17px] -ml-1.5 font-medium">3</span>}
                                    </button>
                                    <div className="ml-0.5">
                                        <Avatar name={config.user.name} className="w-[38px] h-[38px] rounded-full border border-black/5" />
                                    </div>
                                    <div className="flex-1 ml-2 flex flex-col justify-center">
                                        <span className="font-semibold text-black text-[16px] leading-tight tracking-tight">
                                            {isWhatsApp ? config.user.name : "fatima_sayed"}
                                        </span>
                                        {isWhatsApp ? (
                                            <span className="text-[#8E8E93] text-[12px] leading-tight">online</span>
                                        ) : (
                                            <span className="text-[#8E8E93] text-[12px] leading-tight">Active now</span>
                                        )}
                                    </div>
                                    <div className={cn("flex items-center gap-5 mr-3.5", isWhatsApp ? "text-[#007AFF]" : "text-black")}>
                                        <VideoIcon className="w-6 h-6" />
                                        <PhoneIcon className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className={cn("flex-1 p-3 overflow-y-auto relative transition-colors duration-500 flex flex-col gap-1.5 demo-scrollbar", isWhatsApp ? "bg-[#E5DDD5]" : "bg-white")}>
                                    {isWhatsApp && <div className="absolute inset-0 opacity-[0.4] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none mix-blend-overlay"></div>}
                                    
                                    <div className="sticky top-1 flex justify-center z-10 mb-2">
                                        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-[4px] shadow-[0_1px_1px_rgba(0,0,0,0.1)]", isWhatsApp ? "bg-[#E1E8EB] text-[#586469]" : "text-gray-400")}>Today</span>
                                    </div>
                                    
                                    {/* Messages */}
                                    {chat.map((msg, i) => (
                                        <div key={msg.id} className={cn("relative z-10 flex w-full animate-in", msg.sender === 'user' ? "justify-start" : "justify-end")}>
                                            <div className={cn(
                                                "max-w-[75%] px-[12px] py-[8px] text-[16px] leading-[20px] relative shadow-sm",
                                                isWhatsApp 
                                                    ? (msg.sender === 'user' 
                                                        ? "bg-white text-black rounded-[7.5px] rounded-tl-none wa-bubble-tail-in ml-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]" 
                                                        : "bg-[#E1FCD7] text-black rounded-[7.5px] rounded-tr-none wa-bubble-tail-out mr-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]")
                                                    : (msg.sender === 'user'
                                                        ? "bg-gray-100 text-black rounded-3xl rounded-bl-sm ml-1"
                                                        : "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-3xl rounded-br-sm mr-1")
                                            )}>
                                                <span className="break-words">{msg.text}</span>
                                                {/* Meta info (Time + Checks) */}
                                                {isWhatsApp && (
                                                    <div className="float-right ml-2 mt-1.5 flex items-end gap-0.5 h-[14px]">
                                                        <span className="text-[11px] text-[#999999] leading-none mb-0.5">{msg.time}</span>
                                                        {msg.sender === 'ai' && (
                                                            <div className="mb-0.5">
                                                                {msg.status === 'read' 
                                                                    ? <CheckDoubleIcon className="w-[14px] h-[10px] text-[#34B7F1]" /> 
                                                                    : <CheckDoubleIcon className="w-[14px] h-[10px] text-[#999999]" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Typing Indicator */}
                                    {step === 'user_typing' && (
                                        <div className="relative z-10 flex w-full animate-in justify-start">
                                            <div className={cn("px-3 py-2 rounded-[7.5px] flex gap-1 items-center shadow-sm ml-2", isWhatsApp ? "bg-white" : "bg-gray-100 rounded-3xl")}>
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full opacity-60 animate-bounce-delay-1"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full opacity-60 animate-bounce-delay-2"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full opacity-60 animate-bounce-delay-3"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Input Area */}
                                <div className={cn("min-h-[70px] border-t flex items-end pb-[22px] px-2 gap-2 z-20", isWhatsApp ? "bg-[#F6F6F6] border-[#B2B2B2]/30" : "bg-white border-gray-100")}>
                                    <div className="mb-[9px] ml-1">
                                        {isWhatsApp ? <PlusIcon className="w-[26px] h-[26px] text-[#007AFF] stroke-[1.5]" /> : <CameraIcon className="w-[24px] h-[24px] text-[#007AFF] bg-blue-500 rounded-full p-1 text-white" />}
                                    </div>
                                    <div className={cn("flex-1 min-h-[34px] bg-white rounded-[18px] border px-3 py-1 flex items-center mb-[5px] relative", isWhatsApp ? "border-[#E5E5EA]" : "border-gray-200 bg-gray-100")}>
                                        {step === 'ai_typing' ? (
                                            <span className="text-[16px] text-black animate-pulse">|</span>
                                        ) : (
                                            <>
                                                <span className="text-[16px] text-black"></span>
                                                <div className="ml-auto text-[#C7C7CC]">
                                                    {isWhatsApp ? <StickerIcon className="w-[22px] h-[22px]"/> : null}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {step === 'ai_typing' ? (
                                        <div className="mb-[5px] mr-1"><SendIcon className="w-[30px] h-[30px] text-[#007AFF]"/></div>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-[9px] mr-1">
                                            {isWhatsApp ? (
                                                <>
                                                    <CameraIcon className="w-[24px] h-[24px] text-[#007AFF]" />
                                                    <MicIcon className="w-[24px] h-[24px] text-[#007AFF]" />
                                                </>
                                            ) : (
                                                <MicIcon className="w-[24px] h-[24px] text-black" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            
                                {/* Home Indicator */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-black/80 rounded-full z-50 backdrop-blur-md"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. INTELLIGENCE CONNECTOR */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 hidden md:flex items-center justify-center w-[300px]">
                     <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-zinc-700 relative overflow-hidden">
                        {(step === 'ai_processing' || step === 'crm_updating' || step === 'ai_typing') && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent w-1/2 animate-beam h-full blur-[2px]"></div>
                        )}
                     </div>
                     <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className={cn(
                            "w-16 h-16 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-xl flex items-center justify-center transition-all duration-500",
                            (step === 'ai_processing' || step === 'crm_updating') ? "scale-110 border-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.4)]" : "scale-100"
                        )}>
                            <BrainCircuitIcon className={cn("w-8 h-8 transition-colors duration-300", (step === 'ai_processing' || step === 'crm_updating') ? "text-primary" : "text-gray-400")} />
                        </div>
                     </div>
                </div>

                {/* 3. CRM WIDGET */}
                <div className="w-[340px] z-10 perspective-1000">
                    <div className={cn(
                        "relative bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-6 transition-all duration-700",
                        step === 'idle' ? "opacity-50 scale-95 translate-y-4" : "opacity-100 scale-100 translate-y-0"
                    )}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Flowtiva CRM</span>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Contact</label>
                                <div className="h-12 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 flex items-center px-4 shadow-sm transition-all duration-500 overflow-hidden relative">
                                    {crmData.name ? (
                                        <div className="flex items-center gap-3 animate-in slide-in-from-left-4 fade-in duration-500">
                                            <Avatar name={config.user.name} className="w-6 h-6" />
                                            <span className="font-semibold text-sm">{crmData.name}</span>
                                        </div>
                                    ) : <div className="w-1/3 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>}
                                    <div className={cn("absolute inset-0 bg-green-400/10 transition-opacity duration-500", crmData.name ? "opacity-0" : "opacity-0")} /> 
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Detected Intent</label>
                                <div className="h-12 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 flex items-center px-4 shadow-sm relative overflow-hidden">
                                     {crmData.intent ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary animate-in zoom-in-90 fade-in duration-300">
                                            {crmData.intent}
                                        </span>
                                    ) : <div className="w-1/4 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Stage</label>
                                    <div className="h-12 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 flex items-center px-4 shadow-sm relative overflow-hidden">
                                        {crmData.stage && (
                                            <span className="text-xs font-medium animate-in fade-in duration-300">{crmData.stage}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Tag</label>
                                    <div className="h-12 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 flex items-center px-4 shadow-sm relative overflow-hidden">
                                        {crmData.tag && (
                                            <span className="text-xs font-medium text-gray-500 animate-in fade-in duration-300">#{crmData.tag}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="mt-8 pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", step === 'complete' ? "bg-green-500" : "bg-yellow-500 animate-pulse")}></div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">{step === 'complete' ? "Synced" : "Processing"}</span>
                            </div>
                            {isWhatsApp ? (
                                <WhatsAppIcon className="w-5 h-5 opacity-50 grayscale hover:grayscale-0 transition-all"/>
                            ) : (
                                <InstagramGradientIcon className="w-5 h-5 opacity-50 grayscale hover:grayscale-0 transition-all" />
                            )}
                         </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
