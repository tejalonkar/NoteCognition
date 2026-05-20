import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Cloud, 
  X, 
  ExternalLink, 
  RotateCcw, 
  Save, 
  Info, 
  Settings, 
  AlertTriangle,
  Check
} from 'lucide-react';
import { getAppConfig, saveCustomConfig, clearCustomConfig, type AppConfig } from '../services/ConfigService';

interface AwsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange: () => void;
}

export function AwsConfigModal({ isOpen, onClose, onConfigChange }: AwsConfigModalProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // Form fields
  const [apiUrl, setApiUrl] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [userPoolId, setUserPoolId] = useState('');
  const [userPoolClientId, setUserPoolClientId] = useState('');
  const [region, setRegion] = useState('');
  
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getAppConfig();
      setConfig(active);
      setApiUrl(active.apiUrl);
      setWsUrl(active.wsUrl);
      setUserPoolId(active.userPoolId);
      setUserPoolClientId(active.userPoolClientId);
      setRegion(active.region);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!apiUrl || !wsUrl || !userPoolId || !userPoolClientId || !region) {
      alert('Please fill in all backend parameters.');
      return;
    }

    saveCustomConfig({
      apiUrl: apiUrl.trim(),
      wsUrl: wsUrl.trim(),
      userPoolId: userPoolId.trim(),
      userPoolClientId: userPoolClientId.trim(),
      region: region.trim(),
    });

    setSuccessMsg('AWS configuration saved successfully! Reloading...');
    onConfigChange();
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('Are you sure you want to restore the default developer stack settings?')) {
      clearCustomConfig();
      onConfigChange();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl my-8 p-6 sm:p-8 rounded-2xl shadow-2xl relative"
        style={{
          backgroundColor: 'var(--md-secondary-surface)',
          border: '1px solid var(--md-border)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#2D3250] transition-colors"
          style={{ color: 'var(--md-text-secondary)' }}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Cloud className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AWS Backend Hosting Settings</h2>
            <p className="text-xs text-gray-400">Configure NoteCognition to run on your own private AWS account</p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-[#2D3250]/40 border border-indigo-500/20 rounded-xl p-4 mb-6 flex gap-3 text-sm text-gray-300">
          <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Privacy First:</span> When using a custom stack, your notes and credentials are sent directly from your browser to your AWS account. They never touch any third-party servers.
          </div>
        </div>

        {/* Deployment Section */}
        <div className="border border-white/5 bg-black/20 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            Step 1: Deploy Infrastructure
          </h3>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            You can deploy NoteCognition's serverless infrastructure (Cognito, DynamoDB, Lambdas, S3, WebSockets) by uploading the generated template to your AWS account:
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://console.aws.amazon.com/cloudformation/home#/stacks/create/template"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-3 px-4 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
            >
              <span>Open AWS CloudFormation Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            
            <button
              type="button"
              onClick={() => handleCopy('transformed-template.yaml', 'template')}
              className="px-4 py-3 bg-[#2D3250] hover:bg-[#2D3250]/80 border border-white/5 rounded-lg text-xs text-gray-300 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {copiedText === 'template' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied filename!</span>
                </>
              ) : (
                <>
                  <span>Copy Template File Name</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            * In AWS, click **Upload a template file** and choose <code className="bg-black/40 px-1 py-0.5 rounded text-gray-400 text-[9px]">cloudformation/transformed-template.yaml</code> from your local repository.
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-indigo-400" />
            Step 2: Connect Stack Outputs
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">VITE_API_URL</label>
              <input
                type="url"
                required
                placeholder="https://xxxxxx.execute-api.region.amazonaws.com/dev/"
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">VITE_WS_URL</label>
              <input
                type="url"
                required
                placeholder="wss://xxxxxx.execute-api.region.amazonaws.com/dev/"
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">VITE_USER_POOL_ID</label>
              <input
                type="text"
                required
                placeholder="ap-south-1_xxxxxxxxx"
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
                value={userPoolId}
                onChange={(e) => setUserPoolId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">VITE_USER_POOL_CLIENT_ID</label>
              <input
                type="text"
                required
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
                value={userPoolClientId}
                onChange={(e) => setUserPoolClientId(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">VITE_REGION</label>
              <input
                type="text"
                required
                placeholder="ap-south-1"
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
          </div>

          {/* Warnings and Statuses */}
          {config.isCustom && (
            <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>You are currently using a custom AWS backend. Saving new values or restoring defaults will log you out of your current session.</span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div>
              {config.isCustom && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium py-2 px-3 rounded-lg hover:bg-red-500/5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default Stack</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-white font-medium py-2 px-4 rounded-lg hover:bg-[#2D3250] transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
