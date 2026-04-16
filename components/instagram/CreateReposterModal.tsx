
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseService';
import { InstagramInstance } from '../../types';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';

interface CreateReposterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJobCreated: () => void;
    instances: InstagramInstance[];
}

export const CreateReposterModal: React.FC<CreateReposterModalProps> = ({ isOpen, onClose, onJobCreated, instances }) => {
    const [instanceId, setInstanceId] = useState('');
    const [targetUsername, setTargetUsername] = useState('');
    const [maxReels, setMaxReels] = useState(10);
    const [interval, setInterval] = useState(60);
    
    // AI Customization
    const [niche, setNiche] = useState('');
    const [tone, setTone] = useState('Professional');
    const [customCta, setCustomCta] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async () => {
        if (!instanceId || !targetUsername || !niche) {
            addToast("Please fill in all required fields (Account, Target, Niche).", { type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            await supabase.client.from('instagram_reposter_jobs').insert({
                instance_id: instanceId,
                target_username: targetUsername.replace('@', '').trim(),
                max_reels: maxReels,
                repost_interval_minutes: interval,
                niche: niche,
                tone: tone,
                custom_cta: customCta,
                status: 'active'
            });
            addToast('Viral reposter job created successfully!', { type: 'success' });
            onJobCreated();
            onClose();
        } catch (error: any) {
            addToast(error.message, { type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal open={isOpen} onOpenChange={onClose}>
            <ModalContent className="max-w-xl">
                <ModalHeader>
                    <ModalTitle>New Viral Reposter Job</ModalTitle>
                    <ModalDescription>Automate finding, rewriting, and reposting viral content from your niche.</ModalDescription>
                </ModalHeader>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Your Account (Poster)</label>
                            <select 
                                value={instanceId} 
                                onChange={(e) => setInstanceId(e.target.value)} 
                                className="mt-1 w-full h-10 rounded-md border border-brand-border bg-brand-primary px-2 text-sm"
                            >
                                <option value="" disabled>Select an account</option>
                                {instances.map(inst => (
                                    <option key={inst.id} value={inst.id}>@{inst.username}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Source Account (Target)</label>
                            <Input 
                                value={targetUsername} 
                                onChange={(e) => setTargetUsername(e.target.value)} 
                                placeholder="e.g., competitors_handle" 
                            />
                        </div>
                    </div>

                    <div className="border-t border-brand-border pt-4">
                        <h4 className="font-semibold text-brand-text-primary mb-3">AI Caption Strategy</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Business Niche / Industry</label>
                                <Input 
                                    value={niche} 
                                    onChange={(e) => setNiche(e.target.value)} 
                                    placeholder="e.g., Luxury Real Estate in Doha" 
                                />
                                <p className="text-xs text-brand-text-secondary mt-1">The AI uses this to frame the content relevance.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Tone of Voice</label>
                                    <select 
                                        value={tone} 
                                        onChange={(e) => setTone(e.target.value)} 
                                        className="mt-1 w-full h-10 rounded-md border border-brand-border bg-brand-primary px-2 text-sm"
                                    >
                                        <option value="Professional">Professional</option>
                                        <option value="Hype / Viral">Hype / Viral</option>
                                        <option value="Casual / Friendly">Casual / Friendly</option>
                                        <option value="Luxury / Elegant">Luxury / Elegant</option>
                                        <option value="Urgent / FOMO">Urgent / FOMO</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Call to Action (CTA)</label>
                                    <Input 
                                        value={customCta} 
                                        onChange={(e) => setCustomCta(e.target.value)} 
                                        placeholder="e.g., Link in Bio for details!" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-brand-border pt-4">
                        <h4 className="font-semibold text-brand-text-primary mb-3">Scheduling Limits</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Max Items to Fetch</label>
                                <Input 
                                    type="number" 
                                    min={1} 
                                    max={50} 
                                    value={maxReels} 
                                    onChange={(e) => setMaxReels(parseInt(e.target.value))} 
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Check Interval (Mins)</label>
                                <Input 
                                    type="number" 
                                    min={15} 
                                    value={interval} 
                                    onChange={(e) => setInterval(parseInt(e.target.value))} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !instanceId || !targetUsername || !niche}>
                        {isLoading ? 'Configuring AI...' : 'Start Automation'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
