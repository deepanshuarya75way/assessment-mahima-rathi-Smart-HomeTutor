import { useState, useEffect, useCallback } from 'react';

/**
 * Custom React hook to maintain dashboard active tab across browser refreshes (F5),
 * direct URL entry, and browser Back/Forward navigation.
 *
 * Sources of truth priority:
 * 1. URL Query Parameter `?tab=...` or Hash `#...`
 * 2. `localStorage` fallback
 * 3. `defaultTab`
 */
export const useDashboardTab = (
  storageKey,
  defaultTab = 'overview',
  validTabs = [],
  tabAliases = {}
) => {
  const normalizeTab = useCallback(
    (rawTab) => {
      if (!rawTab || typeof rawTab !== 'string') return null;
      const trimmed = rawTab.trim().toLowerCase();

      // Check alias mapping
      if (tabAliases[trimmed]) {
        return tabAliases[trimmed];
      }

      // Check exact match in validTabs
      if (validTabs.length === 0 || validTabs.includes(trimmed)) {
        return trimmed;
      }

      // Check case-insensitive match in validTabs
      const match = validTabs.find((vt) => vt.toLowerCase() === trimmed);
      if (match) return match;

      return null;
    },
    [validTabs, tabAliases]
  );

  const getInitialTab = useCallback(() => {
    try {
      // 1. Check URL search query parameter 'tab'
      const params = new URLSearchParams(window.location.search);
      let tabFromUrl = params.get('tab');

      // Check URL hash fallback (#sessions, etc.)
      if (!tabFromUrl && window.location.hash) {
        tabFromUrl = window.location.hash.replace('#', '').trim();
      }

      if (tabFromUrl) {
        const normalized = normalizeTab(tabFromUrl);
        if (normalized) {
          return normalized;
        }
      }

      // 2. Check localStorage fallback
      const storedTab = localStorage.getItem(storageKey);
      if (storedTab) {
        const normalizedStored = normalizeTab(storedTab);
        if (normalizedStored) {
          return normalizedStored;
        }
      }
    } catch (err) {
      console.error('Error getting initial dashboard tab:', err);
    }

    return defaultTab;
  }, [storageKey, defaultTab, normalizeTab]);

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = useCallback(
    (newTab) => {
      if (!newTab) return;
      try {
        const canonicalTab = normalizeTab(newTab) || newTab;
        setActiveTabState(canonicalTab);
        localStorage.setItem(storageKey, canonicalTab);

        // Seamlessly update URL query parameter with history.pushState so Back/Forward works
        const url = new URL(window.location.href);
        if (url.searchParams.get('tab') !== canonicalTab) {
          url.searchParams.set('tab', canonicalTab);
          window.history.pushState({}, '', url.toString());
        }
      } catch (err) {
        console.error('Error setting dashboard tab:', err);
      }
    },
    [storageKey, normalizeTab]
  );

  useEffect(() => {
    // Initial sync to ensure URL query param is present on page load without clearing existing query params
    try {
      const url = new URL(window.location.href);
      const currentTab = getInitialTab();
      if (url.searchParams.get('tab') !== currentTab) {
        url.searchParams.set('tab', currentTab);
        window.history.replaceState({}, '', url.toString());
      }
      localStorage.setItem(storageKey, currentTab);
    } catch (err) {
      console.error('Error syncing initial URL query param:', err);
    }

    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        let tabFromUrl = params.get('tab');
        if (!tabFromUrl && window.location.hash) {
          tabFromUrl = window.location.hash.replace('#', '').trim();
        }

        if (tabFromUrl) {
          const normalized = normalizeTab(tabFromUrl);
          if (normalized) {
            setActiveTabState(normalized);
            localStorage.setItem(storageKey, normalized);
          }
        }
      } catch (err) {
        console.error('Error handling popstate tab change:', err);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [storageKey, getInitialTab, normalizeTab]);

  return [activeTab, setActiveTab];
};

