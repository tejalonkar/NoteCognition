import { useState } from 'react';
import { motion } from 'motion/react';
import { authService } from '../services/AuthService';
import { Mail, Lock, LogIn, ChevronRight, X, ShieldCheck } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'confirm';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function AuthModal({ isOpen, onSuccess, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const resetFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetFeedback();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      if (mode === 'signin') {
        await authService.signIn(email, password);
        onSuccess();
      } else if (mode === 'signup') {
        await authService.signUp(email, password);
        setMode('confirm');
        setMessage('Check your email for the confirmation code.');
      } else {
        await authService.confirmSignUp(email, code);
        setMode('signin');
        setPassword('');
        setCode('');
        setMessage('Account confirmed. You can sign in now.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const title = mode === 'signin'
    ? 'Welcome Back'
    : mode === 'signup'
      ? 'Create Account'
      : 'Confirm Email';
  const subtitle = mode === 'confirm'
    ? 'Enter the code AWS Cognito sent you'
    : 'Continue to NoteCognition';
  const buttonLabel = mode === 'signin'
    ? 'Sign In'
    : mode === 'signup'
      ? 'Sign Up'
      : 'Confirm';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl relative"
        style={{
          backgroundColor: 'var(--md-secondary-surface)',
          border: '1px solid var(--md-border)',
          overflow: 'hidden'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-lg hover:bg-[#2D3250] transition-colors"
          style={{ color: 'var(--md-text-secondary)' }}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              {mode === 'confirm' ? (
                <ShieldCheck className="text-white w-8 h-8" />
              ) : (
                <LogIn className="text-white w-8 h-8" />
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              {title}
            </h2>
            <p className="text-sm text-gray-400">
              {subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mode === 'confirm'}
              />
            </div>

            {mode !== 'confirm' ? (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Confirmation Code"
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            )}

            {message && <p className="text-emerald-400 text-xs px-1">{message}</p>}
            {error && <p className="text-red-400 text-xs px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>
                  {buttonLabel}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-400">
            {mode === 'signin' ? (
              <button onClick={() => switchMode('signup')} className="hover:text-white transition-colors">
                Need an account? Sign up
              </button>
            ) : mode === 'signup' ? (
              <button onClick={() => switchMode('signin')} className="hover:text-white transition-colors">
                Already have an account? Sign in
              </button>
            ) : (
              <button onClick={() => switchMode('signin')} className="hover:text-white transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
