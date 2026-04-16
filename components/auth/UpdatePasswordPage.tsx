import React, { useState } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../contexts/LanguageContext';

const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-brand-accent">
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM6 8.83v6.34L11.03 12 6 8.83zm7 0v6.34L18.03 12 13 8.83z"/>
    </svg>
);

const calculatePasswordStrength = (password: string): { score: number; label: string } => {
  if (password.length === 0) return { score: 0, label: '' };
  if (password.length < 8) return { score: 1, label: 'Too short' };
  let checks = 0;
  if (/[a-z]/.test(password)) checks++;
  if (/[A-Z]/.test(password)) checks++;
  if (/\d/.test(password)) checks++;
  if (/[^A-Za-z0-9]/.test(password)) checks++;
  switch (checks) {
    case 1: return { score: 1, label: 'Weak' };
    case 2: return { score: 2, label: 'Medium' };
    case 3: return { score: 3, label: 'Strong' };
    case 4: return { score: 4, label: 'Very Strong' };
    default: return { score: 1, label: 'Weak' };
  }
};

const STRENGTH_CONFIG: Record<number, { color: string; textColor: string }> = {
  1: { color: 'bg-status-red', textColor: 'text-status-red' },
  2: { color: 'bg-status-yellow', textColor: 'text-status-yellow' },
  3: { color: 'bg-status-green', textColor: 'text-status-green' },
  4: { color: 'bg-status-green', textColor: 'text-status-green' },
};

const PasswordStrengthMeter: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const config = STRENGTH_CONFIG[score] || { color: 'bg-brand-border', textColor: 'text-brand-text-secondary'};
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5 h-1.5 rounded-full">
        {[...Array(4)].map((_, i) => <div key={i} className={`flex-1 rounded-full transition-colors ${i < score ? config.color : 'bg-brand-border'}`}/>)}
      </div>
      {label && <p className={`text-xs font-medium ${config.textColor}`}>{label}</p>}
    </div>
  );
};

interface UpdatePasswordPageProps {
  onSuccess: () => void;
}

export const UpdatePasswordPage: React.FC<UpdatePasswordPageProps> = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const { t } = useTranslation();
    const [strength, setStrength] = useState<{ score: number; label: string }>({ score: 0, label: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (strength.score < 3) {
            setError("Password is too weak. Please choose a stronger one.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await firebaseService.updateUser({ password });
            if (updateError) throw updateError;
            addToast('Your password has been updated successfully! Please sign in.', { type: 'success' });
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-brand-secondary flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center text-center mb-8 mx-auto">
                    <LogoIcon />
                    <h1 className="text-3xl font-bold text-brand-text-primary ms-2">Flowtiva</h1>
                </div>
                <div className="bg-brand-primary p-8 rounded-xl shadow-md border border-brand-border">
                    <h2 className="text-2xl font-semibold text-brand-text-primary text-center mb-6">
                       Set a New Password
                    </h2>
                    {error && <div className="bg-status-red/10 border border-status-red/20 text-status-red text-sm rounded-md p-3 mb-4" role="alert">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="password"className="text-sm font-medium text-brand-text-primary">New Password</label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setStrength(calculatePasswordStrength(e.target.value));
                                }}
                                placeholder={t('auth.passwordPlaceholder')}
                                required
                                className="mt-1"
                            />
                            {password.length > 0 && <PasswordStrengthMeter score={strength.score} label={strength.label} />}
                        </div>
                         <div>
                            <label htmlFor="confirmPassword"className="text-sm font-medium text-brand-text-primary">Confirm New Password</label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="mt-1"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading} size="lg">
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// FIX: Added default export for compatibility with React.lazy
export default UpdatePasswordPage;
