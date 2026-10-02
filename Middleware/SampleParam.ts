/**
 * SampleParam Personalize Proxy Extension (Sitecore Content SDK 2.x)
 *
 * Extends the Content SDK PersonalizeProxy to capture a custom `sampleParam`
 * query string parameter from the URL and forward it as an experience parameter
 * to Sitecore Personalize, so conditions can evaluate it at runtime.
 *
 * When a visitor hits a page with ?sampleParam=<value>, the proxy extracts that
 * value and includes it in the personalization request.
 *
 * It also guards against a Content SDK bug: Personalize answers null for a flow
 * it does not know (for example page variants Edge still lists after the page's
 * own flow is gone). The SDK reads `.variantId` off that null inside a single
 * Promise.all, so one orphaned flow throws away every other variant on the page
 * and the visitor always gets the default. The override below treats a null
 * answer as "no variant for that flow".
 *
 * Integration:
 *   1. Import this class in your Next.js `src/proxy.ts`.
 *   2. Instantiate it in place of the default `PersonalizeProxy`.
 *   3. Pass it last into `defineProxy(...)`.
 *
 * See the project README for full wiring instructions.
 */

import { type NextRequest } from 'next/server';
import { PersonalizeProxy } from '@sitecore-content-sdk/nextjs/proxy';

type PersonalizeExperienceParams = ReturnType<PersonalizeProxy['getExperienceParams']>;
type ExtendedExperienceParams = PersonalizeExperienceParams & { sampleParam?: string };

export class SampleParamPersonalizeProxy extends PersonalizeProxy {
  protected getExperienceParams(req: NextRequest): ExtendedExperienceParams {
    const params = super.getExperienceParams(req) as ExtendedExperienceParams;

    const sampleValue = req.nextUrl.searchParams.get('sampleParam') || undefined;

    if (sampleValue) {
      params.sampleParam = sampleValue;
    }

    return params;
  }

  protected async personalize(
    args: Parameters<PersonalizeProxy['personalize']>[0]
  ): ReturnType<PersonalizeProxy['personalize']> {
    const result = await super.personalize(args);
    if (!result) {
      console.warn('[Personalize Proxy] No result for flow', args.friendlyId);
      return { variantId: '' };
    }
    return result;
  }
}
