# CDP – Sitecore Personalize Custom Assets

This project contains custom **conditions** and **middleware extensions** used with Sitecore Personalize (CDP) and Sitecore XM Cloud headless applications.

---

## Project Structure

```
CDP/
├── Conditions/          # CDP condition templates (JavaScript)
│   ├── SampleParam.js   # Matches a runtime sampleParam value from the current request
│   └── ShopWebId.js     # Matches a shopWebId from guest IDENTITY event data
├── Components/          # Site components the conditions depend on (TypeScript/React)
│   └── GuestDataCapture.tsx  # Sends the IDENTITY event ShopWebId.js reads
├── Middleware/          # Next.js proxy (formerly middleware) extensions (TypeScript)
│   └── SampleParam.ts   # Extends PersonalizeProxy (Content SDK 2.x) to forward sampleParam and survive null flow answers
└── README.md
```

---

## Conditions

Condition scripts run inside the Sitecore Personalize execution sandbox. Each one is created once in **Personalize → Conditions**, published, and then used as a column in a decision table (component personalization in Pages) or in an audience for an experience or experiment.

### Creating a condition in Personalize

1. **Personalize → Conditions → Create → Custom.**
2. **Name** it (e.g. `SampleParam`). The friendly ID is derived from the name (`sampleparam`).
3. **Paste the script** from `Conditions/` into the code editor, unchanged. It must start with `(function() {` (see [the IIFE rule](#the-script-must-be-an-iife-from-its-first-character)).
4. **Description**: write a sentence containing the parameter token in double brackets. This is what makes the parameter editable when the condition is used (see below). Use the descriptions in the table.
5. **Tags** (optional): anything that helps you find it, e.g. `test`.
6. **Test** (optional): run it against a guest or request, then **Save**.
7. **Publish** → **Confirm publish**. The status must read **Published**; a Draft condition is never evaluated.

| Condition | Description (copy as is) | Parameter |
|---|---|---|
| `SampleParam` | `The url has querystring parameter named sampleParam with value of [[sampleParam]]` | `sampleParam` – the query string value to match, e.g. `123` |
| `ShopWebId` | `The guest's latest session has an IDENTITY event with shopWebId [[shopWebId]]` | `shopWebId` – the shop/store Web ID to match |

#### How the parameter pop-up works

A token in the script declares the parameter, and a token in the description shows it:

```js
// in the script: [[name | type | default | { options }]]
var sampleParamValue = "[[sampleParam | string | | { required: true }]]";
```

```text
// in the description: [[name]]  (same name as the script token)
The url has querystring parameter named sampleParam with value of [[sampleParam]]
```

When the condition is added as a column in a Pages decision table, the column's **⋯ → Edit parameters** dialog renders the description as a sentence with a text box where `[[sampleParam]]` sits. The value typed there replaces the script token when Personalize runs the flow. If the description has no `[[sampleParam]]` token, there is nowhere to enter the value, and a `required` parameter left empty never matches.

#### The script must be an IIFE from its first character

Personalize refuses to publish a condition with **any** text before `(function() {`, including a header comment, a blank line or a byte-order mark. The publish fails with *"Script is not an IIFE (Immediately Invoked Function Expression)"* (a `400` from `PUT /v3/templates/{id}`, visible only in the browser's network tab), and the condition silently stays in **Draft**. Keep comments inside the function, as both scripts here do.

### Using a condition for component personalization (Pages)

1. Open the page in **Pages → Personalize**, select the component, and choose to personalize it with rules. Pages creates a **decision table** for that component.
2. **Add column** → pick the published condition (e.g. *SampleParam*).
3. On the column: **⋯ → Edit parameters**, enter the value (e.g. `123`), **Save**.
4. **Set the cell, not just the column.** In each rule row click the condition's cell and choose **Is true** → **Confirm**. An empty cell is not a test.
5. **Save & close.** Each rule row becomes a component variant; configure it in the right panel (e.g. hide the component, swap the datasource).
6. **Start the personalization.** Select the component again; the right panel shows *Personalized · Draft* with a **Start** button. Until you press it the flow stays `DRAFT` and nothing is served. **Publishing the page does not start it.**
7. **Publish the page** if the variant changed content or presentation, so Experience Edge has the new variant.

### Verifying it on the site

- Request the page from a real browser (scripted clients such as `curl` can be treated as bots, and the personalize proxy skips bots).
- Check the `X-Sc-Rewrite` response header. A match rewrites to `…/_variantId_<componentId>_<variantId>`; a non-match rewrites to `…/_variantId_<componentId>_default`. No `_variantId_` segment at all means the proxy did not personalize; check the host's runtime logs (see [Middleware](#middleware-content-sdk-2x-proxy)).

For `SampleParam`, compare `?sampleParam=123` (variant) with `?sampleParam=999` and no parameter (default).

### `SampleParam.js`

Evaluates the **current request's** `sampleParam` value (forwarded at runtime by the proxy in `Middleware/SampleParam.ts`) against the configured value. Needs that proxy; without it Personalize never sees the value.

| Object Path | Description |
|---|---|
| `request.params.utm.sampleParam` | Custom param forwarded through the UTM namespace |
| `request.params.sampleParam` | Custom param at the top-level params namespace |

**Template parameter:** `sampleParam` (string, required) – the value to match against.

### `ShopWebId.js`

Looks at the **guest's most recent session** for an `IDENTITY` event whose `arbitraryData.ext.shopWebId` matches the configured value. This targets visitors by their associated shop/store.

**Template parameter:** `shopWebId` (string, required) – the store Web ID to match.

Unlike `SampleParam`, this reads **stored guest data**, not the current request, so it needs something on the site that sends the `IDENTITY` event. `Components/GuestDataCapture.tsx` does that: on a URL with `?webid=<value>` it sends an `IDENTITY` event with `extensionData: { shopWebId: <value> }` through `@sitecore-content-sdk/events`.

1. Copy `Components/GuestDataCapture.tsx` into the starter (e.g. `src/components/content-sdk/`).
2. Render it once in the layout, inside the SDK `<Providers>` (the Events SDK must be initialized) and inside a `<Suspense>` boundary, because it uses `useSearchParams`. The article starter does this in `src/Layout.tsx`:

   ```tsx
   <Providers page={page} localizedPaths={localizedPaths}>
     <Suspense fallback={null}>
       <GuestDataCapture />
     </Suspense>
     {/* ...page content */}
   </Providers>
   ```
3. Visit a page with `?webid=12345`, then load a page personalized on `ShopWebId` with the value `12345`. Because the event is stored first and the condition reads it on a later request, the variant shows from the **next** page load, not the one that carried `?webid=`.

The component is skipped under `next dev` (the Events SDK is not initialized there), so test on a deployed build.

---

## Middleware (Content SDK 2.x proxy)

The extension lives in `Middleware/SampleParam.ts`. It extends the Sitecore Content SDK's `PersonalizeProxy` (Next.js 16 proxy, formerly `PersonalizeMiddleware`) so that:

- the `sampleParam` query string value is forwarded to Personalize as an experience parameter on every personalization request, and
- a `null` answer from Personalize for one flow no longer throws away every other variant on the page (see below).

### Why the `personalize()` override matters

Edge can list variants for a page whose flow no longer exists in Personalize, for example page-level variants left behind after the page switched to component personalization. Personalize answers `null` for those. Content SDK 2.4 reads `.variantId` off that null inside one `Promise.all`, so the whole proxy fails and every visitor gets the default variant. The symptom in the host's runtime logs is:

```
Personalize proxy failed:
TypeError: Cannot read properties of null (reading 'variantId')
```

with no `_variantId_` segment in the `X-Sc-Rewrite` response header. The override treats a null answer as "no variant for that flow".

### Wiring it up

The article starter (`xmcloud-starter-js/examples/kit-nextjs-article-starter/src/proxy.ts`) defines the class inline; copying `Middleware/SampleParam.ts` into your starter works the same way.

#### 1. Import the class and the SDK proxies

```typescript
// src/proxy.ts
import { type NextRequest, type NextFetchEvent } from 'next/server';
import {
  defineProxy,
  AppRouterMultisiteProxy,
  RedirectsProxy,
  LocaleProxy,
} from '@sitecore-content-sdk/nextjs/proxy';
import sites from '.sitecore/sites.json';
import scConfig from 'sitecore.config';
import { routing } from './i18n/routing';
import { SampleParamPersonalizeProxy } from './SampleParam'; // wherever you copied Middleware/SampleParam.ts
```

#### 2. Instantiate it in place of `PersonalizeProxy`

```typescript
const personalize = new SampleParamPersonalizeProxy({
  sites,
  ...scConfig.api.edge,
  ...scConfig.personalize,
  skip: () => false,
});
```

#### 3. Register it last in the proxy chain

```typescript
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  // locale, multisite and redirects constructed as in the starter
  return defineProxy(locale, multisite, redirects, personalize).exec(req);
}
```

Order matters: `personalize` goes last so locale, multisite and redirect resolution happen first.

#### 4. Environment variables

Personalize uses the Edge context ID the starter already has (`SITECORE_EDGE_CONTEXT_ID`); without it the proxy disables itself. Optional tuning, from the starter's `.env.remote.example`:

```bash
NEXT_PUBLIC_PERSONALIZE_SCOPE=           # Optional scope to isolate personalization data
PERSONALIZE_PROXY_CDP_TIMEOUT=           # Personalize API timeout in ms (optional)
PERSONALIZE_PROXY_EDGE_TIMEOUT=          # Edge API timeout in ms (optional)
```

### How It Works End-to-End

1. A visitor navigates to `https://yoursite.com/page?sampleParam=test123`.
2. The Next.js proxy runs; `SampleParamPersonalizeProxy.getExperienceParams()` extracts `test123` from the query string.
3. The SDK sends the experience params (including `sampleParam: "test123"`) to the Sitecore Personalize API for each flow on the page.
4. In Personalize, the **SampleParam condition** (`Conditions/SampleParam.js`) compares the value against the configured one.
5. If it matches, the proxy rewrites to the variant (`/_variantId_<componentId>_<variantId>`) and the visitor sees it.

Test from a real browser, not `curl`: the bot-tracking proxy can mark scripted clients as bots, and the personalize proxy skips bots.

---

## Adding a New Custom Parameter

To add another custom query parameter (e.g., `campaignId`):

1. **Proxy** – In `getExperienceParams`, read `req.nextUrl.searchParams.get('campaignId')` and assign it to `params.campaignId`.
2. **Condition** – Create a new JS condition in `Conditions/` that checks `request.params.utm.campaignId` (or `request.params.campaignId`).
3. **CDP** – Create the condition template in Sitecore Personalize and apply it to your experience.

---

## References

- [Sitecore Content SDK configuration file](https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html)
- [Sitecore Personalize Conditions](https://doc.sitecore.com/personalize/en/developers/api/index-en.html)
- Article starter proxy: `xmcloud-starter-js/examples/kit-nextjs-article-starter/src/proxy.ts`
