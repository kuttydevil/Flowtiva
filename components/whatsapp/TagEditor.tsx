import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { WhatsAppContact } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Input } from '../ui/Input';
import { useTranslation } from '../../contexts/LanguageContext';

const TagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

interface TagEditorProps {
    contact: WhatsAppContact;
    instanceId: string;
    onTagsUpdated: (contactName: string, tags: string[]) => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({ contact, instanceId, onTagsUpdated }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [currentTags, setCurrentTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const { addToast } = useToast();
    
    useEffect(() => {
        setCurrentTags(contact.tags || []);
    }, [contact.tags]);

    const handleCancel = () => {
        setIsEditing(false);
        setInputValue('');
        setCurrentTags(contact.tags || []);
    };

    const handleAddTag = () => {
        const newTag = inputValue.trim();
        if (newTag && !currentTags.includes(newTag)) {
            setCurrentTags([...currentTags, newTag]);
        }
        setInputValue('');
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
    };
    
    const handleSave = async () => {
        try {
            await supabase.updateContactTags(instanceId, contact.contact_name, currentTags);
            onTagsUpdated(contact.contact_name, currentTags);
            addToast(t('whatsapp.tagEditor.successToast'), { type: 'success' });
            setIsEditing(false);
        } catch (error: any) {
            addToast(t('whatsapp.tagEditor.errorToast', { error: error.message }), { type: 'error' });
        }
    };
    
    return (
        <div className="relative mt-1">
            <div className="flex items-center flex-wrap gap-2">
                {currentTags.length > 0 ? currentTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-background text-foreground border border-border/50 px-2.5 py-1 rounded-md shadow-sm">
                        {tag}
                    </span>
                )) : (
                     <span className="text-xs text-muted-foreground italic">{t('whatsapp.tagEditor.noTags')}</span>
                )}
                 <button onClick={isEditing ? handleCancel : () => setIsEditing(true)} className="text-xs text-primary font-medium hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1">
                    {isEditing ? t('whatsapp.tagEditor.cancel') : t('whatsapp.tagEditor.edit')}
                </button>
            </div>
            {isEditing && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 p-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-2">
                        <Input 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag();
                                }
                            }}
                            placeholder={t('whatsapp.tagEditor.addPlaceholder')}
                            className="h-10 text-sm bg-muted/30 border-border/50 focus-visible:ring-2 focus-visible:ring-ring transition-colors hover:bg-muted/50 rounded-xl"
                        />
                         <button onClick={handleAddTag} className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring flex-shrink-0" aria-label={t('whatsapp.tagEditor.addPlaceholder')}>
                            <PlusIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                        {currentTags.map(tag => (
                             <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted/50 text-foreground border border-border/50 px-2.5 py-1 rounded-md">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ml-1" aria-label={`Remove ${tag}`}>
                                    <XIcon className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                     <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border/50">
                        <button onClick={handleCancel} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('common.cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl shadow-sm hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {t('whatsapp.tagEditor.save')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};