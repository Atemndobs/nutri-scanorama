import React from 'react';
import * as Sentry from "@sentry/react";

export const SentryTest: React.FC = () => {
  const throwError = () => {
    try {
      throw new Error('Test Sentry Error ' + new Date().toISOString());
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          location: 'SentryTest Component',
          type: 'Manual Test'
        },
        extra: {
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return (
    <Sentry.ErrorBoundary
      fallback={<button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
        An error was captured by Sentry
      </button>}
    >
      <button
        onClick={throwError}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Test Sentry Error
      </button>
    </Sentry.ErrorBoundary>
  );
};
