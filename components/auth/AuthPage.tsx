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

// --- Password Strength Utilities ---

const calculatePasswordStrength = (password: string): { score: number; label: string } => {
  if (password.length === 0) {
    return { score: 0, label: '' };
  }

  if (password.length < 8) {
    return { score: 1, label: 'Too short' };
  }

  let checks = 0;
  if (/[a-z]/.test(password)) checks++;
  if (/[A-Z]/.test(password)) checks++;
  if (/\d/.test(password)) checks++;
  if (/[^A-Za-z0-9]/.test(password)) checks++;

  switch (checks) {
    case 1:
      return { score: 1, label: 'Weak' };
    case 2:
      return { score: 2, label: 'Medium' };
    case 3:
      return { score: 3, label: 'Strong' };
    case 4:
      return { score: 4, label: 'Very Strong' };
    default:
      return { score: 1, label: 'Weak' };
  }
};

const PasswordStrengthMeter: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const strengthConfig = {
    1: { color: 'bg-status-red', textColor: 'text-status-red' },
    2: { color: 'bg-status-yellow', textColor: 'text-status-yellow' },
    3: { color: 'bg-status-green', textColor: 'text-status-green' },
    4: { color: 'bg-status-green', textColor: 'text-status-green' },
  };

  const currentConfig = strengthConfig[score as keyof typeof strengthConfig] || { color: 'bg-brand-border', textColor: 'text-brand-text-secondary'};

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5 h-1.5 rounded-full">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${
              i < score ? currentConfig.color : 'bg-brand-border'
            }`}
          ></div>
        ))}
      </div>
      {label && <p className={`text-xs font-medium ${currentConfig.textColor}`}>{label}</p>}
    </div>
  );
};


interface AuthPageContentProps {
    onHomeNavigate: () => void;
}

const AuthPageContent: React.FC<AuthPageContentProps> = ({ onHomeNavigate }) => {
    const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const { t } = useTranslation();
    const [strength, setStrength] = useState<{ score: number; label: string }>({ score: 0, label: '' });

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (view === 'signUp') {
                if (strength.score < 3) { throw new Error(t('auth.errors.weakPassword')); }
                const { error: signUpError } = await firebaseService.signUp({ email, password });
                if (signUpError) throw signUpError;
                addToast(t('auth.verifyEmailToast'), { type: 'success' });
            } else { // 'signIn'
                const { error: signInError } = await firebaseService.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                addToast(t('auth.signInSuccessToast'), { type: 'success' });
            }
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes('auth/operation-not-allowed')) {
                msg = 'Email/Password authentication is not enabled. Please enable it in the Firebase Console under Authentication -> Sign-in method, or use Google Sign-In.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await firebaseService.signInWithGoogle();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await firebaseService.resetPasswordForEmail(email);
            if (error) throw error;
            addToast('Password reset instructions sent! Please check your email.', { type: 'success' });
            setView('signIn'); // Go back to sign in view
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-brand-secondary flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <button onClick={onHomeNavigate} className="flex items-center justify-center text-center mb-8 group mx-auto">
                    <LogoIcon />
                    <h1 className="text-3xl font-bold text-brand-text-primary ms-2 group-hover:text-brand-accent">Flowtiva</h1>
                </button>
                <div className="bg-brand-primary p-8 rounded-xl shadow-md border border-brand-border">
                    {view === 'forgotPassword' ? (
                        <>
                            <h2 className="text-2xl font-semibold text-brand-text-primary text-center mb-6">Reset Your Password</h2>
                            {error && <div className="bg-status-red/10 border border-status-red/20 text-status-red text-sm rounded-md p-3 mb-4">{error}</div>}
                            <form onSubmit={handlePasswordReset} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="text-sm font-medium text-brand-text-primary">{t('auth.emailLabel')}</label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required className="mt-1"/>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading} size="lg">
                                    {loading ? 'Sending...' : 'Send Reset Instructions'}
                                </Button>
                            </form>
                             <p className="text-center text-sm text-brand-text-secondary mt-6">
                                Remembered your password?
                                <button onClick={() => { setView('signIn'); setError(null); }} className="font-semibold text-brand-accent hover:underline ms-1">
                                    Sign In
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-semibold text-brand-text-primary text-center mb-6">
                                {view === 'signUp' ? t('auth.createTitle') : t('auth.welcomeTitle')}
                            </h2>
                            {error && <div className="bg-status-red/10 border border-status-red/20 text-status-red text-sm rounded-md p-3 mb-4">{error}</div>}
                            <form onSubmit={handleAuth} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="text-sm font-medium text-brand-text-primary">{t('auth.emailLabel')}</label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required className="mt-1"/>
                                </div>
                                <div>
                                    <div className="flex justify-between items-baseline">
                                        <label htmlFor="password" className="text-sm font-medium text-brand-text-primary">{t('auth.passwordLabel')}</label>
                                        {view === 'signIn' && (
                                            <button type="button" onClick={() => { setView('forgotPassword'); setError(null); }} className="text-xs font-semibold text-brand-accent hover:underline">
                                                Forgot Password?
                                            </button>
                                        )}
                                    </div>
                                    <Input id="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (view === 'signUp') { setStrength(calculatePasswordStrength(e.target.value)); }}} placeholder={t('auth.passwordPlaceholder')} required className="mt-1"/>
                                    {view === 'signUp' && password.length > 0 && (<PasswordStrengthMeter score={strength.score} label={strength.label} />)}
                                </div>
                                <Button type="submit" className="w-full" disabled={loading} size="lg">
                                    {loading ? (view === 'signUp' ? t('auth.signingUpButton') : t('auth.signingInButton')) : (view === 'signUp' ? t('auth.signUpButton') : t('auth.signInButton'))}
                                </Button>
                            </form>
                            
                            <div className="relative mt-6 mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-brand-border"></span>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-brand-primary px-2 text-brand-text-secondary">Or continue with</span>
                                </div>
                            </div>
                            
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full flex items-center justify-center gap-2 border-brand-border" 
                                size="lg"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                                </svg>
                                Google
                            </Button>

                            <p className="text-center text-sm text-brand-text-secondary mt-6">
                                {view === 'signUp' ? t('auth.promptSignIn') : t('auth.promptSignUp')}
                                <button onClick={() => { setView(view === 'signUp' ? 'signIn' : 'signUp'); setError(null); }} className="font-semibold text-brand-accent hover:underline ms-1">
                                    {view === 'signUp' ? t('auth.signInButton') : t('auth.signUpButton')}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

interface AuthPageProps {
    onHomeNavigate: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onHomeNavigate }) => {
    return (
        <AuthPageContent onHomeNavigate={onHomeNavigate} />
    );
};

export default AuthPage;