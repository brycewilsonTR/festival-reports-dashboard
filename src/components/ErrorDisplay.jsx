import React from 'react';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';

const ErrorDisplay = ({ error, onRetry }) => {
  if (!error) return null;

  const getErrorMessage = (error) => {
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter || 2;
      return `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`;
    }
    
    if (error.response?.data?.resultMessage) {
      return error.response.data.resultMessage;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const isRateLimited = error.response?.status === 429;
  const retryAfter = error.response?.data?.retryAfter || 2;

  return (
    <div className={`border rounded-lg p-4 mb-6 ${
      isRateLimited 
        ? 'bg-yellow-50 border-yellow-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start">
        {isRateLimited ? (
          <Clock className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${
            isRateLimited ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {isRateLimited ? 'Rate Limited' : 'Error'}
          </h3>
          <p className={`mt-1 text-sm ${
            isRateLimited ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {getErrorMessage(error)}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRateLimited}
              className={`mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isRateLimited
                  ? 'text-yellow-600 bg-yellow-100 cursor-not-allowed opacity-50'
                  : 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500'
              }`}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {isRateLimited ? `Wait ${retryAfter}s` : 'Try Again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay; 