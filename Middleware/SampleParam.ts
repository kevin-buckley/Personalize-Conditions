/**
 * SampleParam Personalize Middleware Extension
 *
 * Extends the Sitecore Content SDK PersonalizeMiddleware to capture a custom
 * `sampleParam` query string parameter from the URL and forward it as an
 * experience parameter to Sitecore Personalize (CDP).
 *
 * When a visitor hits a page with ?sampleParam=<value>, the middleware extracts
 * that value and includes it in the personalization request so CDP conditions
 * can evaluate against it at runtime.
 *
 * Integration:
 *   1. Import this class in your Next.js `src/middleware.ts`.
 *   2. Instantiate it in place of the default `PersonalizeMiddleware`.
 *   3. Pass it into `defineMiddleware(...)`.
 *
 * See the project README for full wiring instructions.
 */

import { type NextRequest } from 'next/server';
import { PersonalizeMiddleware } from '@sitecore-content-sdk/nextjs/middleware';
import type { ExperienceParams } from '@sitecore-content-sdk/nextjs/types/middleware/personalize-middleware';

type ExtendedExperienceParams = ExperienceParams & { sampleParam?: string };

export class SampleParamPersonalizeMiddleware extends PersonalizeMiddleware {
  protected getExperienceParams(req: NextRequest): ExperienceParams {
    const params = super.getExperienceParams(req) as ExtendedExperienceParams;

    const sampleValue =
      req.nextUrl.searchParams.get('sampleParam') || undefined;

    if (sampleValue) {
      params.sampleParam = sampleValue;
    }

    return params;
  }
}
