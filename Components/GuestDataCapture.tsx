'use client';

import { useEffect, useRef, JSX } from 'react';
import { useSearchParams } from 'next/navigation';
import { identity } from '@sitecore-content-sdk/events';

/**
 * GuestDataCapture Component
 *
 * Captures query string parameters and sends them as guest extension data
 * to Sitecore CDP for personalization.
 *
 * Supported query parameters:
 * - webid: Shop context for cart abandonment / order completion teasers
 *
 * Extension Data Keys (camelCase, alphanumeric only per CDP API spec):
 * - shopWebId
 *
 * Example URLs:
 * - /?webid=12345 - Shows "complete your order" teasers
 *
 * @see https://doc.sitecore.com/sdk/en/developers/006/cloud-sdk/identity-events.html
 * @see https://api-docs.sitecore.com/cdp/guest-rest-api/guest-data-extension
 */

const GuestDataCapture = (): JSX.Element => {
  const searchParams = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls on re-renders
    if (hasRun.current) {
      return;
    }

    // Skip in development mode (Events SDK not initialized)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[GuestDataCapture] Skipped in development mode');
      return;
    }

    // Extract query parameters for personalization
    const webid = searchParams.get('webid');

    // Only send if we have the webid parameter
    if (!webid) {
      return;
    }

    // Build extension data object with the custom attributes
    // Keys must be alphanumeric and camelCase per CDP API spec
    const extensionData: Record<string, string> = {
      shopWebId: webid,
    };

    hasRun.current = true;

    // Send IDENTITY event with extension data (similar pattern to pageView in CdpPageView)
    identity({
      channel: 'WEB',
      currency: 'USD',
      identifiers: [
        {
          id: 'anonymous_visitor',
          provider: 'WEBSITE',
        },
      ],
      extensionData,
    })
      .then(() => {
        console.log('[GuestDataCapture] Sent guest extension data:', extensionData);
      })
      .catch((error) => {
        console.debug('[GuestDataCapture] Failed to send guest data:', error);
      });
  }, [searchParams]);

  return <></>;
};

export default GuestDataCapture;
