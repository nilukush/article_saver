import React, { useEffect, useRef } from 'react';

interface EthicalAdProps {
  publisher: string;
  type?: 'text' | 'image';
  keywords?: string[];
  placement?: string;
  theme?: 'light' | 'dark';
  className?: string;
  style?: 'stickybox' | 'fixedfooter';
}

declare global {
  interface Window {
    ethicalads?: {
      reload: () => void;
      disable: () => void;
      enable: () => void;
    };
  }
}

const EthicalAd: React.FC<EthicalAdProps> = ({
  publisher,
  type = 'text',
  keywords = ['developer-tools', 'productivity', 'open-source', 'read-later'],
  placement,
  theme = 'light',
  className = '',
  style,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Only load script if not already loaded
    if (!scriptLoadedRef.current && !document.querySelector('script[src*="ethicalads.min.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://media.ethicalads.io/media/client/ethicalads.min.js';
      script.async = true;
      
      script.onload = () => {
        scriptLoadedRef.current = true;
        // Reload ads after script loads
        if (window.ethicalads) {
          window.ethicalads.reload();
        }
      };
      
      document.head.appendChild(script);
    }

    // Clean up function
    return () => {
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, []);

  // Reload ads when placement changes
  useEffect(() => {
    if (scriptLoadedRef.current && window.ethicalads) {
      window.ethicalads.reload();
    }
  }, [placement]);

  return (
    <div className={`ethical-ad-wrapper ${className}`}>
      <div
        ref={adRef}
        data-ea-publisher={publisher}
        data-ea-type={type}
        data-ea-keywords={keywords?.join('|')}
        id={placement}
        data-ea-theme={theme}
        data-ea-style={style}
        className="ethical-ad"
      />
      <div className="ethical-ad-label">
        <span>Sponsored</span>
      </div>
    </div>
  );
};

export default EthicalAd;