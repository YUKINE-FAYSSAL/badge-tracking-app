import React from 'react';

export default function Spinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading"
        className="fixed inset-0 flex justify-center items-center bg-white bg-opacity-70 z-50"
      >
        <img
          src="/assets/images/spiner/logo.png"
          alt="Loading"
          className={`${sizeClasses[size]} animate-pulse`}
          style={{ animationDuration: '1.8s' }}
          draggable={false}
        />
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.75;
            }
          }

          .animate-pulse {
            animation: pulse 1.8s ease-in-out infinite;
          }
        `}
      </style>
    </>
  );
}
