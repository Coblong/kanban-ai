'use client';

import clsx from 'clsx';

type VoiceOrbProps = {
  isActive: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
};

export const VoiceOrb = ({ isActive, isSpeaking, onToggle }: VoiceOrbProps) => {
  const pulseDuration = isSpeaking ? '0.85s' : '2.6s';
  const ringDuration = isSpeaking ? '1.1s' : '2.9s';
  const ringDelay = isSpeaking ? '0.45s' : '1.1s';

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div className="relative flex items-center justify-center w-24 h-24">
        {isActive && (
          <>
            <div
              className="absolute w-full h-full rounded-full border border-[var(--accent-violet-bright)]/30"
              style={{ animation: `orb-ring-expand ${ringDuration} ease-out infinite` }}
            />
            <div
              className="absolute w-full h-full rounded-full border border-[var(--accent-cyan)]/20"
              style={{
                animation: `orb-ring-expand ${ringDuration} ease-out infinite`,
                animationDelay: ringDelay,
              }}
            />
          </>
        )}
        <button
          onClick={onToggle}
          className={clsx(
            'relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
            isActive
              ? 'bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)]'
              : 'bg-[var(--bg-elevated)] border border-[var(--border-hover)] hover:border-[var(--accent-violet-bright)]/50',
          )}
          style={
            isActive
              ? { animation: `orb-throb ${pulseDuration} ease-in-out infinite` }
              : undefined
          }
          aria-label={isActive ? 'End voice call' : 'Start voice call'}
        >
          {isActive ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-white opacity-90"
            >
              <rect x="3" y="3" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-[var(--text-secondary)]"
            >
              <rect x="8" y="1" width="6" height="11" rx="3" />
              <path d="M3 10c0 4.418 3.582 8 8 8s8-3.582 8-8" />
              <line x1="11" y1="18" x2="11" y2="21" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-[11px] text-[var(--text-secondary)]">
        {isActive ? (isSpeaking ? 'AI speaking...' : 'Listening...') : 'Tap to start voice'}
      </p>
    </div>
  );
};
