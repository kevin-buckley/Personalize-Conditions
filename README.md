# CDP – Sitecore Personalize Custom Assets

This project contains custom **conditions** and **middleware extensions** used with Sitecore Personalize (CDP) and Sitecore XM Cloud headless applications.

---

## Project Structure

```
CDP/
├── Conditions/          # CDP condition templates (JavaScript)
│   ├── SampleParam.js   # Matches a runtime sampleParam value from the current request
│   └── ShopWebId.js     # Matches a shopWebId from guest IDENTITY event data
├── Middleware/           # Next.js middleware extensions (TypeScript)
│   └── SampleParam.ts   # Extends PersonalizeMiddleware to forward sampleParam to CDP
└── README.md
```

---

## Conditions

Condition scripts run inside the Sitecore Personalize execution sandbox. They are pasted into **Sitecore Personalize → Conditions** when creating audience rules for experiences or experiments.

### `SampleParam.js`

Evaluates the **current request's** `sampleParam` value (passed at runtime via middleware) against a configured value.

| Object Path | Description |
|---|---|
| `request.params.utm.sampleParam` | Custom param forwarded through the UTM namespace |
| `request.params.sampleParam` | Custom param at the top-level params namespace |

**Template parameter:** `sampleParam` (string, required) – the value to match against.

### `ShopWebId.js`

Looks at the **guest's most recent session** for an `IDENTITY` event whose `arbitraryData.ext.shopWebId` matches the configured value. This targets visitors by their associated shop/store.

**Template parameter:** `shopWebId` (string, required) – the store Web ID to match.

---

## Middleware

The middleware extension lives in `Middleware/SampleParam.ts`. It extends the Sitecore Content SDK's `PersonalizeMiddleware` so that the `sampleParam` query string value is forwarded to CDP as an experience parameter on every personalization request.

### Wiring Up the Middleware

The middleware must be integrated into a Next.js XM Cloud starter's `src/middleware.ts`. Here is a step-by-step guide using the article starter as a reference.

#### 1. Copy the middleware class into your starter

Copy `Middleware/SampleParam.ts` into your Next.js project, or reference the class directly. In the article starter the class is defined inline in `src/middleware.ts`:

```typescript
// src/middleware.ts
import { type NextRequest, type NextFetchEvent } from 'next/server';
import {
  defineMiddleware,
  AppRouterMultisiteMiddleware,
  PersonalizeMiddleware,
  RedirectsMiddleware,
  LocaleMiddleware,
} from '@sitecore-content-sdk/nextjs/middleware';
import type { ExperienceParams } from '@sitecore-content-sdk/nextjs/types/middleware/personalize-middleware';
import sites from '.sitecore/sites.json';
import scConfig from 'sitecore.config';
import { routing } from './i18n/routing';
```

#### 2. Define the extended middleware class

```typescript
type ExtendedExperienceParams = ExperienceParams & { sampleParam?: string };

class SampleParamPersonalizeMiddleware extends PersonalizeMiddleware {
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
```

#### 3. Instantiate the personalize middleware

```typescript
const personalize = new SampleParamPersonalizeMiddleware({
  sites,
  ...scConfig.api.edge,
  ...scConfig.personalize,
  skip: () => false,
});
```

#### 4. Register it in the middleware chain

```typescript
export function middleware(req: NextRequest, ev: NextFetchEvent) {
  return defineMiddleware(locale, multisite, redirects, personalize).exec(req, ev);
}
```

The order matters — `personalize` should be last so that locale, multisite, and redirect resolution happen first.

#### 5. Set environment variables

Add these to your `.env.local` (values from XM Cloud Portal → Environment → Developer Settings):

```bash
NEXT_PUBLIC_PERSONALIZE_SCOPE=           # Optional scope to isolate personalization data
PERSONALIZE_MIDDLEWARE_CDP_TIMEOUT=       # CDP API timeout in ms (optional)
PERSONALIZE_MIDDLEWARE_EDGE_TIMEOUT=      # Edge API timeout in ms (optional)
```

### How It Works End-to-End

1. A visitor navigates to `https://yoursite.com/page?sampleParam=test123`.
2. Next.js Edge Middleware runs; `SampleParamPersonalizeMiddleware.getExperienceParams()` extracts `test123` from the query string.
3. The SDK sends the experience params (including `sampleParam: "test123"`) to the Sitecore Personalize API.
4. In CDP, the **SampleParam condition** (`Conditions/SampleParam.js`) evaluates `request.params.utm.sampleParam` against the configured value.
5. If the condition matches, the visitor sees the personalized variant.

---

## Adding a New Custom Parameter

To add another custom query parameter (e.g., `campaignId`):

1. **Middleware** – In `getExperienceParams`, read `req.nextUrl.searchParams.get('campaignId')` and assign it to `params.campaignId`.
2. **Condition** – Create a new JS condition in `Conditions/` that checks `request.params.utm.campaignId` (or `request.params.campaignId`).
3. **CDP** – Create the condition template in Sitecore Personalize and apply it to your experience.

---

## References

- [Sitecore Content SDK Middleware Docs](https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html)
- [Sitecore Personalize Conditions](https://doc.sitecore.com/personalize/en/developers/api/index-en.html)
- Article starter middleware: `xmcloud-starter-js/examples/kit-nextjs-article-starter/src/middleware.ts`
