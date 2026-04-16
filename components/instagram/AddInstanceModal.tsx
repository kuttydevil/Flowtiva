

import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PromptGenerator } from '../whatsapp/PromptGenerator';
import { supabase } from '../../services/supabaseService';
import { InstagramInstance } from '../../types';

interface AddInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstanceAdded: () => void;
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({ isOpen, onClose, onInstanceAdded }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setCustomPrompt('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleCreateInstance = async () => {
    if (!username || !password || !customPrompt) {
        addToast("All fields are required.", { type: 'error' });
        return;
    }
    setIsLoading(true);
    try {
        await supabase.addInstagramInstance({
            username,
            password,
            customPrompt,
            context: '' // Add context if needed in the future
        });
        addToast(`Account for @${username} added successfully!`, { type: 'success' });
        onInstanceAdded();
        onClose();
    } catch (error: any) {
        addToast(error.message, { type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Connect New Instagram Account</ModalTitle>
          <ModalDescription>Enter your credentials and configure the AI agent.</ModalDescription>
        </ModalHeader>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
           <div>
            <label className="text-sm font-medium">1. Instagram Username</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" className="mt-1" />
          </div>
           <div>
            <label className="text-sm font-medium">2. Instagram Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
            <p className="text-xs text-brand-text-secondary mt-1">Your credentials are encrypted and stored securely. We only use them to log in on your behalf.</p>
          </div>
          <div>
             <label className="text-sm font-medium">3. AI Agent Details</label>
             <PromptGenerator 
                useCase='personal'
                onPromptGenerated={(prompt) => setCustomPrompt(prompt)}
             />
          </div>
        </div>
         <ModalFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreateInstance} disabled={isLoading || !username || !password || !customPrompt}>
                {isLoading ? "Connecting..." : "Connect Account"}
            </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// FIX: Add default export for compatibility with React.lazy
export default AddInstanceModal;
