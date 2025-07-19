import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseEthicalAdsConfig {
  publisher: string;
  enabled?: boolean;
}

export const useEthicalAds = ({ publisher, enabled = true }: UseEthicalAdsConfig) => {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;

    // Load script on mount
    const loadScript = () => {
      if (!document.querySelector('script[src*="ethicalads.min.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://media.ethicalads.io/media/client/ethicalads.min.js';
        script.async = true;
        
        script.onload = () => {
          // Initialize EthicalAds if needed
          if ((window as any).ethicalads) {
            (window as any).ethicalads.reload();
          }
        };
        
        document.head.appendChild(script);
      }
    };

    loadScript();
  }, [enabled]);

  // Handle route changes in SPA
  useEffect(() => {
    if ((window as any).ethicalads && enabled) {
      (window as any).ethicalads.reload();
    }
  }, [location?.pathname, enabled]);

  // Manual reload function
  const reloadAds = () => {
    if ((window as any).ethicalads) {
      (window as any).ethicalads.reload();
    }
  };

  // Enable/disable ads
  const setAdsEnabled = (shouldEnable: boolean) => {
    if ((window as any).ethicalads) {
      if (shouldEnable) {
        (window as any).ethicalads.enable();
      } else {
        (window as any).ethicalads.disable();
      }
    }
  };

  return { reloadAds, setAdsEnabled };
};