import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Copy, Check } from 'lucide-react';

const AdminCredentials = () => {
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState(false);

  const credentials = {
    email: 'bryce.wilson@ticketrescue.com',
    password: 'bryce'
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-blue-900">Default Admin Credentials</h3>
      </div>
      
      <p className="text-sm text-blue-700 mb-3">
        These are the default admin credentials for the system. Keep them secure and change the password after first login.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Email:</span>
          <div className="flex items-center space-x-2">
            <code className="text-sm bg-blue-100 px-2 py-1 rounded text-blue-800">
              {credentials.email}
            </code>
            <button
              onClick={() => copyToClipboard(credentials.email)}
              className="text-blue-600 hover:text-blue-800"
              title="Copy email"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Password:</span>
          <div className="flex items-center space-x-2">
            <code className="text-sm bg-blue-100 px-2 py-1 rounded text-blue-800">
              {showCredentials ? credentials.password : '••••••••'}
            </code>
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="text-blue-600 hover:text-blue-800"
              title={showCredentials ? 'Hide password' : 'Show password'}
            >
              {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(credentials.password)}
              className="text-blue-600 hover:text-blue-800"
              title="Copy password"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-blue-600">
          <strong>Security Note:</strong> Change the default password immediately after first login.
        </p>
      </div>
    </div>
  );
};

export default AdminCredentials; 