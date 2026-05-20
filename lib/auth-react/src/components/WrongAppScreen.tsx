import React from 'react';
import { useAuthTheme } from '../context/ThemeContext';

export interface WrongAppScreenProps {
  expectedApp?: string;
  currentApp?: string;
  onSwitchPress?: () => void;
  className?: string;
}

export function WrongAppScreen({ expectedApp, currentApp, onSwitchPress, className }: WrongAppScreenProps) {
  const theme = useAuthTheme();

  return (
    <div className={className} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: theme.background }}>
      <div style={{ maxWidth: '440px', width: '100%', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '44px', marginBottom: '14px' }}>📱</div>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: theme.text }}>Wrong app</h2>
        <p style={{ margin: '10px 0 0', color: theme.textMuted, fontSize: '14px', lineHeight: 1.6 }}>
          {expectedApp ? `Please use ${expectedApp} instead.` : 'Please open this link in the correct app.'}
          {currentApp ? ` Current app: ${currentApp}.` : ''}
        </p>
        {onSwitchPress && (
          <button type="button" onClick={onSwitchPress} style={{ marginTop: '18px', width: '100%', border: 'none', borderRadius: '12px', padding: '12px 16px', background: theme.primary, color: theme.onPrimary, fontWeight: 700, cursor: 'pointer' }}>
            Switch app
          </button>
        )}
      </div>
    </div>
  );
}
