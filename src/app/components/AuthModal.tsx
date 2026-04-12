import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from '../services/AuthService';
import { Mail, Lock, LogIn, ChevronRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await authService.signIn(email, password);
        onSuccess();
      } else if (mode === 'signup') {
        await authService.signUp(email, password);
        setMode('confirm');
      } else if (mode === 'confirm') {
        await authService.confirmSignUp(email, code);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <LogIn className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Verify Email'}
            </h2>
            <p className="text-sm text-gray-400">
              {mode === 'login' ? 'Continue to NoteCognition' : 'Join our developer community today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'confirm' && (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
            {mode !== 'confirm' && (
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
            )}
            {mode === 'confirm' && (
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Verification Code"
                  className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500/50 transition-all"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            )}
            {error && <p className="text-red-400 text-xs px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Get Started' : 'Confirm Account'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-gray-400">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-indigo-400 font-medium">Create one</button>
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-indigo-400 font-medium">Back to login</button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
