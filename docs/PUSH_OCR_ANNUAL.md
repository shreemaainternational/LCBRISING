# Push Notifications · Bill OCR · Annual Report · Mobile Pay

Four enhancements layered on top of the reporting + mobile + CRM stack.

## 1. Annual Report with Officer Letters

`src/lib/reports/builders/annual-report.ts` overrides the `yearly` report type
with a richer template inheriting all KPIs/charts/tables from the base
period builder, plus:

* **President's Message** — opens the narrative, addressed to fellow Lions
* **Secretary's Report** — governance + reporting summary
* **Treasurer's Report** — cash mobilised, budget vs actuals, net surplus
* **Mega Projects of the Year** — top 10 by impact (beneficiaries × funds)
* **Top Donors — Roll of Honour** — ranked donor recognition (up to 20)
* **CSR Partners & Sponsors** — partner ledger sorted by lifetime contribution
* **Member Recognition & Awards** — awarded items for the Lions Year
* **Future Roadmap** + **Acknowledgements** + **About This Report** appendix

Officer names are auto-populated from `members` (roles `president`,
`secretary`, `treasurer` with `status='active'`); fallback labels are used
when no officer is on file.

The dispatcher in `src/lib/reports/index.ts` now routes `type: 'yearly'`
to this builder. All other types still use the standard pipeline.

## 2. Bill OCR

`src/lib/ai/bill-ocr.ts` adds OpenAI-vision extraction for expense
receipts, supplier invoices, restaurant bills, medical bills etc.

Returns:
```ts
{
  merchant_name, merchant_gstin, invoice_no, invoice_date,
  subtotal, tax, discount, total, currency,
  items: [{ description, qty, unit_price, amount }],
  payment_mode, confidence, notes
}
```

### API

```
POST /api/ai/ocr/bill
  Content-Type: multipart/form-data → field "file"
  OR Content-Type: application/json → { base64, mimeType }
```

Returns `503 ocr_failed_or_not_configured` if `OPENAI_API_KEY` is missing.

### Mobile integration

`/m/activities/new` gains a purple **Scan expense bill** card:

* `<input type="file" accept="image/*" capture="environment">` opens the
  rear camera on iOS / Android.
* On capture, the file is POSTed to `/api/ai/ocr/bill`.
* The form auto-fills `total → expenses`, `invoice_date → date`, and seeds
  the description with the merchant name when blank.

Activity now persists `budget` and `expenses` columns too via the
`PATCH /api/activities/[id]` route.

## 3. Push Notifications (Web Push)

Full VAPID-signed Web Push pipeline.

### Migration

`supabase/migrations/0021_push_subscriptions.sql` — `push_subscriptions`
table with `endpoint` (unique), `p256dh`, `auth`, `member_id`,
`user_agent`, `topics[]`, `is_active`, `last_used_at`. RLS policies for
admins and self.

### Library

```
src/lib/push.ts
├── isPushConfigured()
├── getVapidPublicKey()
├── sendPushToSubscriptions(subs, payload)
├── broadcastPush(payload)
├── broadcastToTopic(topic, payload)
└── pushToMember(memberId, payload)
```

* Dead endpoints (HTTP 404/410) are automatically deactivated.
* Successful sends bump `last_used_at`.

### Service worker

`public/sw.js` already hosts the PWA shell cache. It now also handles:

* `push` event → `showNotification(title, { body, icon, badge, tag, data, actions })`
* `notificationclick` → focuses an existing window or opens `data.url`

### API

```
GET    /api/push/subscribe         # returns { configured, publicKey } for the client
POST   /api/push/subscribe         # upserts subscription for the current member
POST   /api/push/unsubscribe       # marks subscription inactive
POST   /api/push/send              # admin-only: broadcast / topic / member
```

### UI

* **Mobile** `/m/profile` — `<PushToggle>` enables/disables on this
  device with full status (unsupported / denied / disabled / enabled).
* **Admin** `/admin/notifications` — config status, device stats,
  broadcast form (title + body + deep-link URL).

### Env

```
VAPID_PUBLIC_KEY                 # generated with `npx web-push generate-vapid-keys`
VAPID_PRIVATE_KEY                # ditto
VAPID_SUBJECT                    # mailto:admin@yourdomain — defaults to mailto:admin@lcbaroda.org
NEXT_PUBLIC_VAPID_PUBLIC_KEY     # same value as VAPID_PUBLIC_KEY, exposed to the browser
```

If unset, `/admin/notifications` shows an inline configuration hint and
the broadcast button is disabled.

## 4. Mobile Pay Quick-Action

The existing `/pay/[id]` page already has full PhonePe / GPay / Paytm
deep-link intents (`buildPhonePeIntent`, `buildGpayIntent`,
`buildPaytmIntent` in `src/lib/upi.ts`). The mobile home (`/m`) now has a
"Pay / UPI" quick-action tile that opens `/invoices/lookup`, so members
can find an invoice and tap straight into the native UPI app flow.

## Smoke test

```
npx tsx scripts/smoke-annual.ts
```

Renders `/tmp/smoke-annual.{pdf,pptx}` against canned data — useful for
visual review of the annual template without hitting the database.
