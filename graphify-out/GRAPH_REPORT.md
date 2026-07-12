# Graph Report - .  (2026-07-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2728 nodes · 6954 edges · 203 communities (157 shown, 46 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `715bc00a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- build-activity-report.js
- index.ts
- requirePermission
- requireDistrictGovernor
- server.ts
- lions.ts
- requireZoneChair
- requireAdmin
- loadOidcSettings
- createAdminClient
- card.tsx
- invoices.ts
- quick-add-presets.ts
- env.ts
- utils.ts
- route.ts
- auth.ts
- route.ts
- portal-session.ts
- integrations-registry.ts
- CardHeader
- loadLionsApiSettings
- engine.ts
- compilerOptions
- LionsYearCalendar.tsx
- clientIp
- PageHero.tsx
- multi-district-portal.ts
- build_a19_deck.py
- requireRegionChair
- page.tsx
- guard.ts
- devDependencies
- push.ts
- page.tsx
- sendEmail
- page.tsx
- Footer.tsx
- formatINRShort
- page.tsx
- dependencies
- getCurrentMember
- GreetingComposer.tsx
- default-district.ts
- page.tsx
- page.tsx
- apply_to_production.sql
- 0003_enterprise_crm.sql
- ZoneTabs.tsx
- club-health.ts
- CreativeBuilder.tsx
- GovernanceConsole.tsx
- page.tsx
- route.ts
- ActionItemsBoard.tsx
- compliance.ts
- page.tsx
- billing.ts
- phonepe.ts
- ZoneLoginForm.tsx
- isDevAuthBypass
- isSupabaseConfigured
- 0001_initial_schema.sql
- page.tsx
- dedupe.ts
- page.tsx
- zone-awards.ts
- MinutesBoard.tsx
- 0020_reporting_engine.sql
- page.tsx
- page.tsx
- AgendaBoard.tsx
- page.tsx
- route.ts
- page.tsx
- page.tsx
- package.json
- smoke-test.mjs
- page.tsx
- cron-auth.ts
- index.ts
- ClubMap.tsx
- PhotoMultiUpload.tsx
- page.tsx
- layout.tsx
- PaymentClient.tsx
- ics.ts
- OidcSetupForm.tsx
- loadVapidConfig
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- 0040_dues_three_tier.sql
- page.tsx
- layout.tsx
- page.tsx
- page.tsx
- layout.tsx
- page.tsx
- page.tsx
- page.tsx
- page.tsx
- jwks.ts
- 0010_payment_invoices.sql
- page.tsx
- route.ts
- bill-ocr.ts
- route.ts
- route.ts
- route.ts
- LookupForm.tsx
- route.ts
- route.ts
- 0002_social_creative.sql
- 0041_district_sync_circulars.sql
- 0051_public_site_tables.sql
- build_a19_docx.py
- build_a19_pptx.py
- BroadcastComposer.tsx
- LionsApiSetupForm.tsx
- SyncUploader.tsx
- route.ts
- route.ts
- page.tsx
- 0037_federation_rls.sql
- 0045_activity_approvals.sql
- 0052_blog_storytelling.sql
- 0053_lions_webhook_and_sync_meta.sql
- apply_all_pending.sql
- apply_pr47_50.sql
- vercel.json
- layout.tsx
- TestimonialsCarousel.tsx
- 0015_agent_commissions.sql
- 0024_photo_captions.sql
- 0025_zone_chairperson.sql
- 0035_governance_clubs.sql
- page.tsx
- 0011_refunds.sql
- 0013_recurring_invoices.sql
- 0027_zone_minutes_automation.sql
- 0032_lions_sandbox.sql
- 0046_advisory_voting.sql
- 0048_sync_queue.sql
- create_campaigns.sql
- create_photos.sql
- create_site_counters.sql
- eslint.config.mjs
- next.config.ts
- pdfkit
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-select
- @radix-ui/react-slot
- react
- react-dom
- resend
- @supabase/ssr
- @supabase/supabase-js
- twilio
- web-push
- postcss.config.mjs
- sw.js
- deploy.sh script
- 0012_portal_otp.sql
- 0014_customer_prefs.sql
- 0021_push_subscriptions.sql
- 0026_zone_agenda.sql
- 0028_lions_calendar.sql
- 0029_action_items.sql
- 0030_lions_oidc_settings.sql
- 0031_lions_api_settings.sql
- 0034_cron_settings.sql
- 0036_district_governor.sql
- 0042_md_council_chair.sql
- 0043_push_settings.sql
- 0044_clubs_geo.sql
- 0047_donor_packs.sql
- add_tb_kit_distribution.sql
- create_newsletter_subscribers.sql
- page.tsx

## God Nodes (most connected - your core abstractions)
1. `createAdminClient()` - 434 edges
2. `createClient()` - 164 edges
3. `requireAdmin()` - 135 edges
4. `requireZoneChair()` - 80 edges
5. `env` - 59 edges
6. `requirePermission()` - 52 edges
7. `getCurrentMember()` - 48 edges
8. `isGuardFailure()` - 48 edges
9. `CardContent()` - 47 edges
10. `Card` - 46 edges

## Surprising Connections (you probably didn't know these)
- `activityPage()` --indirect_call--> `v()`  [INFERRED]
  scripts/build-activity-report.js → src/lib/integrations-registry.ts
- `renderQrDataUrl()` --references--> `qrcode`  [EXTRACTED]
  src/lib/qr.ts → package.json
- `renderDonorPackPdf()` --references--> `PDFDocument`  [EXTRACTED]
  src/lib/donor-pack.ts → scripts/build-activity-report.js
- `renderInvoicePdf()` --references--> `PDFDocument`  [EXTRACTED]
  src/lib/pdf.ts → scripts/build-activity-report.js
- `renderQrCardPdf()` --references--> `PDFDocument`  [EXTRACTED]
  src/lib/qr-card.ts → scripts/build-activity-report.js

## Import Cycles
- None detected.

## Communities (203 total, 46 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.06
Nodes (125): pptxgenjs, pptxgenjs, doc, period, doc, period, GenerateReportForm(), MONTHS (+117 more)

### Community 1 - "build-activity-report.js"
Cohesion: 0.05
Nodes (71): activityPage(), acts, args, buildLead(), capitalize(), CAUSE_MAP, CAUSE_ORDER, causeDivider() (+63 more)

### Community 2 - "index.ts"
Cohesion: 0.08
Nodes (47): ALLOWED, POST(), POST(), Body, POST(), csvActivitiesAdapter, RowSchema, csvAttendanceAdapter (+39 more)

### Community 3 - "requirePermission"
Cohesion: 0.11
Nodes (41): GET(), POST(), GET(), POST(), friendlyError(), GET(), POST(), GET() (+33 more)

### Community 4 - "requireDistrictGovernor"
Cohesion: 0.08
Nodes (32): createSchema, GET(), POST(), GET(), GET(), POST(), DistrictCalendarPage(), Props (+24 more)

### Community 5 - "server.ts"
Cohesion: 0.07
Nodes (32): actionTone(), AuditPage(), AuditRow, AutomationPage(), ROLES, Club, ClubOfficersPage(), MemberRef (+24 more)

### Community 6 - "lions.ts"
Cohesion: 0.09
Nodes (37): LionsHubPage(), LionsSyncPanel(), SyncReport, LionsSyncPage(), GET(), POST(), RunRow, DistrictSyncResult (+29 more)

### Community 7 - "requireZoneChair"
Cohesion: 0.06
Nodes (40): DELETE(), PATCH(), patchSchema, createSchema, GET(), POST(), POST(), schema (+32 more)

### Community 8 - "requireAdmin"
Cohesion: 0.06
Nodes (36): POST(), schema, DELETE(), GET(), PATCH(), DELETE(), POST(), GET() (+28 more)

### Community 9 - "loadOidcSettings"
Cohesion: 0.12
Nodes (32): OidcSetupPage(), clearTransientCookies(), GET(), GET(), GET(), POST(), GET(), pickProfile() (+24 more)

### Community 10 - "createAdminClient"
Cohesion: 0.07
Nodes (28): DELETE(), GET(), PATCH(), patchSchema, PATCH(), patchSchema, GET(), Body (+20 more)

### Community 11 - "card.tsx"
Cohesion: 0.09
Nodes (23): CronSecretCard(), Props, MODELS, OpenAiSettingsForm(), Props, Props, PushKeyCard(), PushBroadcastForm() (+15 more)

### Community 12 - "invoices.ts"
Cohesion: 0.13
Nodes (29): qrcode, qrcode, GET(), POST(), GET(), GET(), GET(), generateMetadata() (+21 more)

### Community 13 - "quick-add-presets.ts"
Cohesion: 0.10
Nodes (24): AdminActivitiesPage(), ClubsPage(), DistrictRow, DistrictsPage(), AdminEventsPage(), MembersPage(), SocialPage(), DistrictRef (+16 more)

### Community 14 - "env.ts"
Cohesion: 0.10
Nodes (23): POST(), POST(), metadata, viewport, env, integrations, parsed, schema (+15 more)

### Community 15 - "utils.ts"
Cohesion: 0.09
Nodes (22): ActivityGallery(), nowMs(), Props, Tab, ActivityDetailPage(), AdminBlogIndex(), Row, CommissionActions() (+14 more)

### Community 16 - "route.ts"
Cohesion: 0.10
Nodes (31): logUsage(), POST(), schema, baseSchema, DELETE(), friendlyError(), normalisePayload(), OpResult (+23 more)

### Community 17 - "auth.ts"
Cohesion: 0.07
Nodes (31): csv(), GET(), csvCell(), csvLine(), GET(), BYPASS_MEMBER, Activity, AttendanceStatus (+23 more)

### Community 18 - "route.ts"
Cohesion: 0.13
Nodes (28): POST(), POST(), SETTLEABLE, POST(), POST(), PUT(), POST(), PhonePeEvent (+20 more)

### Community 19 - "portal-session.ts"
Cohesion: 0.11
Nodes (24): POST(), GET(), PATCH(), schema, metadata, PortalLoginPage(), PortalLoginForm(), metadata (+16 more)

### Community 20 - "integrations-registry.ts"
Cohesion: 0.12
Nodes (25): OpenAiSetupPage(), CATEGORY_META, CATEGORY_ORDER, IntegrationsPage(), Props, QuickEnableSandbox(), GET(), fromEnv() (+17 more)

### Community 21 - "CardHeader"
Cohesion: 0.09
Nodes (19): BulkInvoiceCard(), CreateResult, Preview, NewInvoiceCard(), AdminPaymentsPage(), InvoiceRow, Proof, safe() (+11 more)

### Community 22 - "loadLionsApiSettings"
Cohesion: 0.14
Nodes (25): DELETE(), PUT(), upsertSchema, POST(), getWebhookSecret(), LionsEvent, POST(), verify() (+17 more)

### Community 23 - "engine.ts"
Cohesion: 0.13
Nodes (24): POST(), GET(), POST(), advance(), enqueueJob(), expireStaleInvoices(), handlers, JobHandler (+16 more)

### Community 24 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, ./src/* (+21 more)

### Community 25 - "LionsYearCalendar.tsx"
Cohesion: 0.13
Nodes (21): GET(), MdCalendarPage(), Props, Props, RegionCalendarPage(), CATEGORIES, empty(), EventEditor() (+13 more)

### Community 26 - "clientIp"
Cohesion: 0.17
Nodes (20): POST(), POST(), schema, normalizePhone(), POST(), handleJson(), handleMultipart(), POST() (+12 more)

### Community 27 - "PageHero.tsx"
Cohesion: 0.10
Nodes (18): AboutPage(), avatar(), JOURNEY, LEADERS, metadata, STATS, VALUES, Cause (+10 more)

### Community 28 - "multi-district-portal.ts"
Cohesion: 0.16
Nodes (16): GET(), MdDistrictsPage(), MdTabs(), TABS, AdvisoryRow, MdNotificationsPage(), MultiDistrictDashboard(), MdProfilePage() (+8 more)

### Community 29 - "build_a19_deck.py"
Cohesion: 0.16
Nodes (26): Canvas, _arc_text(), build(), bullets(), draw_background(), draw_district_emblem(), draw_footer(), draw_header() (+18 more)

### Community 30 - "requireRegionChair"
Cohesion: 0.17
Nodes (15): GET(), RegionNotificationsPage(), RegionDashboard(), RegionProfilePage(), RegionTabs(), TABS, RegionReportsPage(), RegionZonesPage() (+7 more)

### Community 31 - "page.tsx"
Cohesion: 0.10
Nodes (18): getRecentActivities(), getStats(), HomePage(), metadata, AboutSection(), COLLAGE, TAGS, DonateCTABanner() (+10 more)

### Community 32 - "guard.ts"
Cohesion: 0.14
Nodes (20): GET(), currentActor(), legacyToLions(), ActorScope, authorize(), can(), canActOnScope(), MATRIX (+12 more)

### Community 33 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx (+17 more)

### Community 34 - "push.ts"
Cohesion: 0.15
Nodes (21): NotificationsPage(), POST(), schema, GET(), POST(), schema, broadcastPush(), broadcastToTopic() (+13 more)

### Community 35 - "page.tsx"
Cohesion: 0.14
Nodes (17): OperationsSearch(), filterActions(), isAvailable(), MODE_META, OperationsPage(), Props, CATEGORY_LINKS, FEATURED_KEYS (+9 more)

### Community 36 - "sendEmail"
Cohesion: 0.13
Nodes (18): Body, MemberRow, POST(), GET(), POST(), DonationRow, DonorGroup, donorPackEmail() (+10 more)

### Community 37 - "page.tsx"
Cohesion: 0.17
Nodes (19): CLUB_RANK, MyClub(), OfficerRow, DISTRICT_RANK, MyDistrict(), OfficerRow, COURSES, DISTRICT_RANK (+11 more)

### Community 38 - "Footer.tsx"
Cohesion: 0.10
Nodes (10): FOCUS_AREAS, Footer(), getVisitorCount(), PageViewBeacon(), Cause, CAUSES, NAV, NavItem (+2 more)

### Community 39 - "formatINRShort"
Cohesion: 0.12
Nodes (16): ClubDetailPage(), Campaign, CampaignCard(), CampaignsPage(), Donation, EmptyCampaigns(), FeaturedCampaign(), loadCampaigns() (+8 more)

### Community 40 - "page.tsx"
Cohesion: 0.18
Nodes (16): BlogDetailPage(), BlogPost, generateMetadata(), getPost(), getRelated(), generateMetadata(), getStory(), Story (+8 more)

### Community 41 - "dependencies"
Cohesion: 0.11
Nodes (20): class-variance-authority, clsx, lucide-react, next, dependencies, class-variance-authority, clsx, lucide-react (+12 more)

### Community 42 - "getCurrentMember"
Cohesion: 0.13
Nodes (13): AdvisoryVotingRow, GET(), POST(), schema, VoteRow, POST(), schema, EventRow (+5 more)

### Community 43 - "GreetingComposer.tsx"
Cohesion: 0.11
Nodes (14): GreetingComposer(), Lang, LANGS, MemberLite, Occasion, OCCASIONS, Props, splitLine() (+6 more)

### Community 44 - "default-district.ts"
Cohesion: 0.21
Nodes (15): GET(), POST(), friendlyError(), GET(), POST(), schema, BootstrapResult, currentLionsYear() (+7 more)

### Community 45 - "page.tsx"
Cohesion: 0.20
Nodes (14): defaultConfig(), GET(), PUT(), upsertSchema, AutomationBoard(), AutomationRow, nowMs(), Props (+6 more)

### Community 46 - "page.tsx"
Cohesion: 0.18
Nodes (13): ZoneAnalyticsPage(), Props, shortName(), ZoneAnalyticsCharts(), ClubAnalytics, getZoneAnalytics(), linfit(), MonthlySeries (+5 more)

### Community 47 - "apply_to_production.sql"
Cohesion: 0.20
Nodes (18): public.attendance, public.audit_logs, public.awards, public.clubs, public.committee_members, public.committees, public.districts, public.integrations (+10 more)

### Community 48 - "0003_enterprise_crm.sql"
Cohesion: 0.20
Nodes (18): public.attendance, public.audit_logs, public.awards, public.clubs, public.committee_members, public.committees, public.districts, public.integrations (+10 more)

### Community 49 - "ZoneTabs.tsx"
Cohesion: 0.16
Nodes (11): ChangePasswordForm(), State, metadata, ProfilePage(), isoSince(), ZoneAttendancePage(), ZoneNotificationsPage(), ZoneProfilePage() (+3 more)

### Community 50 - "club-health.ts"
Cohesion: 0.20
Nodes (16): GET(), POST(), schema, aiClubCommentary(), assessAllClubs(), assessClubHealth(), assessFromClub(), assessZoneClubs() (+8 more)

### Community 51 - "CreativeBuilder.tsx"
Cohesion: 0.16
Nodes (12): AiOutput, ContentType, CreativeBuilder(), Platform, PLATFORMS, TYPES, Button, ButtonProps (+4 more)

### Community 52 - "GovernanceConsole.tsx"
Cohesion: 0.15
Nodes (11): CLUB_CATEGORIES, ClubRow, ClubTable(), DistrictRow, GovernanceConsole(), HistoryRow, Props, RISK_PILL() (+3 more)

### Community 53 - "page.tsx"
Cohesion: 0.15
Nodes (5): BeneficiaryForm(), BeneficiaryInit, Props, BeneficiaryProfilePage(), ServiceLogForm()

### Community 54 - "route.ts"
Cohesion: 0.19
Nodes (13): coerceOne(), coerceRows(), numberOrNull(), ParsedRow, POST(), RowInput, stringOrNull(), POST() (+5 more)

### Community 55 - "ActionItemsBoard.tsx"
Cohesion: 0.15
Nodes (10): ActionItemRow, ActionItemsBoard(), Channel, nowMs(), Priority, PRIORITY_META, Props, Status (+2 more)

### Community 56 - "compliance.ts"
Cohesion: 0.28
Nodes (13): DuesPage(), GET(), AgeingBucket, ClubComplianceRow, DuesKpis, DuesTier, DuesTierBreakdown, getClubCompliance() (+5 more)

### Community 57 - "page.tsx"
Cohesion: 0.20
Nodes (11): formatDuration(), STATUS_VARIANT, SyncLogRow, SyncPage(), QueueActions(), countTable(), ENTITIES, EntityCoverage (+3 more)

### Community 58 - "billing.ts"
Cohesion: 0.22
Nodes (13): POST(), schema, applyLateFees(), BillCycleOptions, BillCycleReport, computePeriod(), DuesTier, insertInvoiceIfMissing() (+5 more)

### Community 59 - "phonepe.ts"
Cohesion: 0.33
Nodes (9): checkStatus(), host(), InitiateInput, initiatePayment(), InitiateResult, isConfigured(), StatusResult, xVerify() (+1 more)

### Community 60 - "ZoneLoginForm.tsx"
Cohesion: 0.19
Nodes (5): Props, Props, Props, Props, ZoneLoginForm()

### Community 61 - "isDevAuthBypass"
Cohesion: 0.21
Nodes (9): ActionResult, signInAction(), signUpAction(), LoginForm(), LoginPage(), isDevAuthBypass(), config, proxy() (+1 more)

### Community 62 - "isSupabaseConfigured"
Cohesion: 0.22
Nodes (10): dynamicEntries(), sitemap(), Featured, FeaturedActivities(), getCategoryCounts(), EventRow, formatDateParts(), getUpcoming() (+2 more)

### Community 63 - "0001_initial_schema.sql"
Cohesion: 0.29
Nodes (12): public.activities, public.automation_jobs, public.clubs, public.communications, public.current_member(), public.donations, public.dues, public.event_rsvps (+4 more)

### Community 64 - "page.tsx"
Cohesion: 0.18
Nodes (9): BillCyclePanel(), BillReport, Props, RateCard, DuesTabs(), TABS, Props, Tier (+1 more)

### Community 65 - "dedupe.ts"
Cohesion: 0.24
Nodes (12): DuplicatesPage(), addPairs(), aiClassifyPair(), AiVerdict, bucket(), CandidatePair, DuplicateRow, findCandidatePairs() (+4 more)

### Community 66 - "page.tsx"
Cohesion: 0.24
Nodes (6): GET(), ZoneClubsPage(), ZoneDashboard(), getClubScores(), getZoneAlerts(), getZoneKpis()

### Community 67 - "zone-awards.ts"
Cohesion: 0.21
Nodes (10): fmt(), ZoneAwardsPage(), AwardCriterion, AwardScore, CLUB_EXCELLENCE, ClubAwards, DG_HONOR, getZoneAwardEligibility() (+2 more)

### Community 68 - "MinutesBoard.tsx"
Cohesion: 0.21
Nodes (8): ActionItem, empty(), MinutesBoard(), MinutesEditor(), MinutesItem, Props, toLocal(), ZoneMinutesPage()

### Community 69 - "0020_reporting_engine.sql"
Cohesion: 0.21
Nodes (11): public.activities, public.award_qualifications, public.beneficiaries, public.beneficiary_services, public.csr_partners, public.medical_camp_records, public.report_schedules, public.reports (+3 more)

### Community 70 - "page.tsx"
Cohesion: 0.20
Nodes (8): AdvisoryComposer(), Props, AdvisoryVoteCard(), Props, TallyRow, VoterRow, Props, ZoneAdvisoriesPage()

### Community 71 - "page.tsx"
Cohesion: 0.20
Nodes (5): ApprovalActions(), ApprovalToggle(), Props, Pending, ZoneApprovalsPage()

### Community 72 - "AgendaBoard.tsx"
Cohesion: 0.21
Nodes (9): AgendaBoard(), AgendaCard(), AgendaItem, AgendaStatus, Props, STATUS_META, STATUS_ORDER, toLocal() (+1 more)

### Community 73 - "page.tsx"
Cohesion: 0.25
Nodes (7): EditBlogPostPage(), Row, EMPTY, NewBlogPostPage(), BlogEditor(), BlogPostForm, CATEGORIES

### Community 74 - "route.ts"
Cohesion: 0.22
Nodes (10): fallbackTemplate(), hashtags(), Lang, LANG_INSTRUCTION, Occasion, OCCASION_BRIEF, POST(), schema (+2 more)

### Community 75 - "page.tsx"
Cohesion: 0.20
Nodes (6): Channel, CHANNELS, CircularComposer(), Props, CircularRow, DistrictCircularsPage()

### Community 76 - "page.tsx"
Cohesion: 0.20
Nodes (5): DirectoryTabs(), TABS, MobileDirectory(), OfficerRow, Props

### Community 77 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, typecheck (+1 more)

### Community 78 - "smoke-test.mjs"
Cohesion: 0.22
Nodes (6): BASE_URL, check(), guardedReadEndpoints, guardedWriteEndpoints, record(), results

### Community 79 - "page.tsx"
Cohesion: 0.31
Nodes (7): DiagnosticsPage(), mask(), probeAdmin(), ProbeResult, probeRpc(), probeSsrSelect(), projectRef()

### Community 80 - "cron-auth.ts"
Cohesion: 0.33
Nodes (7): CronSetupPage(), GET(), GET(), loadCronSecret(), peekCronSecret(), timingSafeEqual(), verifyCronAuth()

### Community 81 - "index.ts"
Cohesion: 0.27
Nodes (8): POST(), videoGenerateSchema, ASPECT_DIMENSIONS, generateVideo(), signCloudinary(), VideoRequest, VideoResult, VideoScene

### Community 82 - "ClubMap.tsx"
Cohesion: 0.27
Nodes (8): ClubMap(), ClubPin, ensureLeaflet(), LeafletMap, LeafletNS, pinColor(), Props, Window

### Community 83 - "PhotoMultiUpload.tsx"
Cohesion: 0.24
Nodes (5): CATEGORIES, LogActivityForm(), PhotoItem, PhotoMultiUpload(), Props

### Community 84 - "page.tsx"
Cohesion: 0.33
Nodes (8): ageOn(), daysUntil(), isToday(), isUpcoming(), MemberRow, mmdd(), MobileGreetings(), PersonRow()

### Community 85 - "layout.tsx"
Cohesion: 0.29
Nodes (5): MultiDistrictLayout(), MdHeader(), RegionLayout(), RegionHeader(), MobileSyncBanner()

### Community 86 - "PaymentClient.tsx"
Cohesion: 0.24
Nodes (7): formatRemaining(), OcrInfo, PaymentClient(), ProofState, Props, useCountdown(), Window

### Community 87 - "ics.ts"
Cohesion: 0.33
Nodes (8): RFC-5545, buildIcs(), escapeText(), fmtDate(), fmtUtc(), fold(), IcsCalendar, IcsEvent

### Community 88 - "OidcSetupForm.tsx"
Cohesion: 0.36
Nodes (6): OidcSetupForm(), Props, SettingsRow, findPreset(), OIDC_PROVIDER_PRESETS, OidcProviderPreset

### Community 89 - "loadVapidConfig"
Cohesion: 0.39
Nodes (8): PushSetupPage(), GET(), maskKey(), POST(), PUT(), upsertSchema, invalidateVapidCache(), loadVapidConfig()

### Community 90 - "page.tsx"
Cohesion: 0.28
Nodes (7): BlogPost, CURATED, FeaturedStory(), metadata, BlogExplorer(), BlogStory, CATEGORY_STYLES

### Community 91 - "page.tsx"
Cohesion: 0.25
Nodes (5): ContactForm(), State, TOPICS, MAP_QUERY, metadata

### Community 92 - "page.tsx"
Cohesion: 0.25
Nodes (6): DonateForm(), PRESETS, Window, IMPACT, metadata, OTHER_WAYS

### Community 93 - "page.tsx"
Cohesion: 0.28
Nodes (7): CauseAggRow, ImpactPage(), loadImpact(), metadata, StatCard(), Counter(), FormatStyle

### Community 94 - "0040_dues_three_tier.sql"
Cohesion: 0.33
Nodes (8): public.dues, public.dues_installments, public.dues_invoices, public.dues_payments, public.dues_penalties, public.dues_rate_cards, set_dues_invoice_no, set_updated_dues_invoices

### Community 95 - "page.tsx"
Cohesion: 0.39
Nodes (5): ActivitiesByCategoryChart(), DonationTrendChart(), MembershipPieChart(), AdminDashboard(), getDashboardData()

### Community 96 - "layout.tsx"
Cohesion: 0.39
Nodes (5): AdminLayout(), navItems, LogoutButton(), requireSupabaseEnv(), createClient()

### Community 97 - "page.tsx"
Cohesion: 0.29
Nodes (4): DeletePhotoButton(), AdminMediaPage(), Photo, CATEGORIES

### Community 98 - "page.tsx"
Cohesion: 0.32
Nodes (5): EntitySyncPage(), LedgerRow, QueueRow, VALID, RetryJobButton()

### Community 99 - "layout.tsx"
Cohesion: 0.32
Nodes (5): metadata, MobileLayout(), MobileServiceWorker(), MobileTabBar(), TABS

### Community 100 - "page.tsx"
Cohesion: 0.29
Nodes (3): MobileProfile(), PushToggle(), Status

### Community 101 - "page.tsx"
Cohesion: 0.32
Nodes (7): EventCard(), EventRow, EventsPage(), FALLBACK_IMAGES, fmtDate(), fmtTime(), metadata

### Community 102 - "page.tsx"
Cohesion: 0.32
Nodes (5): COVERAGE, metadata, MediaExplorer(), MediaItem, TYPE_META

### Community 103 - "page.tsx"
Cohesion: 0.54
Nodes (4): RegionPortalPage(), isLionsApiConfigured(), isOidcConfiguredFlag(), ZoneLionsPortalPage()

### Community 104 - "jwks.ts"
Cohesion: 0.32
Nodes (7): ALG_TO_DIGEST, base64urlDecode(), Jwk, JwksResponse, loadKeys(), VerifiedIdToken, verifyIdToken()

### Community 105 - "0010_payment_invoices.sql"
Cohesion: 0.46
Nodes (7): public.invoices, public.payment_audit_logs, public.payment_proofs, public.payments, public.qr_codes, public.set_updated_at(), trg_invoices_updated_at

### Community 106 - "page.tsx"
Cohesion: 0.33
Nodes (4): BeneficiarySearch(), Props, BeneficiariesPage(), Props

### Community 107 - "route.ts"
Cohesion: 0.38
Nodes (6): Body, DELETE(), GET(), POST(), ADMIN_ROLES, isAdminRole()

### Community 108 - "bill-ocr.ts"
Cohesion: 0.43
Nodes (5): POST(), BillItem, BillOcrResult, extractBill(), numOrNull()

### Community 109 - "route.ts"
Cohesion: 0.38
Nodes (6): GET(), POST(), PUT(), randomSecret(), upsertSchema, invalidateCronCache()

### Community 110 - "route.ts"
Cohesion: 0.48
Nodes (6): DELETE(), GET(), maskKey(), PUT(), upsertSchema, invalidateOpenAiCache()

### Community 111 - "route.ts"
Cohesion: 0.38
Nodes (6): ALLOWED_MIME, guessExt(), maxBytesFor(), POST(), SignedItem, SignRequest

### Community 112 - "LookupForm.tsx"
Cohesion: 0.33
Nodes (3): LookupForm(), Result, metadata

### Community 113 - "route.ts"
Cohesion: 0.47
Nodes (4): GET(), ClubInsightsInput, ClubInsightsOutput, generateClubInsights()

### Community 114 - "route.ts"
Cohesion: 0.47
Nodes (5): DELETE(), GET(), PUT(), upsertSchema, invalidateOidcSettingsCache()

### Community 115 - "0002_social_creative.sql"
Cohesion: 0.40
Nodes (5): public.ai_generations, public.creatives, public.social_posts, public.upcoming_birthdays, public.videos

### Community 116 - "0041_district_sync_circulars.sql"
Cohesion: 0.40
Nodes (5): public.circular_recipients, public.district_circulars, public.district_sync_runs, set_circular_ref, set_updated_circular

### Community 117 - "0051_public_site_tables.sql"
Cohesion: 0.33
Nodes (5): public.blog_posts, public.campaigns, public.newsletter_subscribers, public.photos, public.site_counters

### Community 118 - "build_a19_docx.py"
Cohesion: 0.60
Nodes (4): build(), Path, Render the PDF deck pages as PNGs and embed them into a Word (.docx).  This guar, render_pages()

### Community 119 - "build_a19_pptx.py"
Cohesion: 0.60
Nodes (4): build(), Path, Generate the A-19 IT Chairperson presentation as A4 portrait .pptx.  Renders eac, render_pages()

### Community 120 - "BroadcastComposer.tsx"
Cohesion: 0.40
Nodes (3): ApiResult, CHANNELS, SEGMENTS

### Community 121 - "LionsApiSetupForm.tsx"
Cohesion: 0.40
Nodes (3): ApiSettingsRow, LionsApiSetupForm(), Props

### Community 122 - "SyncUploader.tsx"
Cohesion: 0.40
Nodes (3): ENTITIES, Entity, RunResult

### Community 123 - "route.ts"
Cohesion: 0.60
Nodes (4): friendlyError(), GET(), POST(), schema

### Community 124 - "route.ts"
Cohesion: 0.50
Nodes (4): ALLOWED_MIME, guessExt(), POST(), UploadedItem

### Community 125 - "page.tsx"
Cohesion: 0.60
Nodes (3): CheckinScanner(), isoSince(), MobileCheckin()

### Community 126 - "0037_federation_rls.sql"
Cohesion: 0.40
Nodes (4): public.districts, public.multiple_districts, public.regions, public.zones

### Community 127 - "0045_activity_approvals.sql"
Cohesion: 0.50
Nodes (4): public.activities, public.tg_activity_pre_approve(), public.zones, tg_activity_pre_approve

### Community 128 - "0052_blog_storytelling.sql"
Cohesion: 0.50
Nodes (4): public.ai_generations, public.blog_posts, public.campaigns, public.stories

### Community 129 - "0053_lions_webhook_and_sync_meta.sql"
Cohesion: 0.40
Nodes (4): public.clubs, public.lions_api_settings, public.lions_webhook_events, public.officers

### Community 130 - "apply_all_pending.sql"
Cohesion: 0.40
Nodes (3): public.activities, public.newsletter_subscribers, public.site_counters

### Community 131 - "apply_pr47_50.sql"
Cohesion: 0.40
Nodes (4): public.campaigns, public.photos, trg_campaigns_updated, trg_photos_updated

### Community 132 - "vercel.json"
Cohesion: 0.40
Nodes (4): crons, framework, headers, $schema

### Community 135 - "0015_agent_commissions.sql"
Cohesion: 0.67
Nodes (3): public.commission_records, public.invoices, trg_commissions_updated_at

### Community 136 - "0024_photo_captions.sql"
Cohesion: 0.50
Nodes (3): public.activities, public.beneficiaries, public.events

### Community 137 - "0025_zone_chairperson.sql"
Cohesion: 0.67
Nodes (3): public.advisories, public.regions, public.zones

### Community 138 - "0035_governance_clubs.sql"
Cohesion: 0.83
Nodes (3): public.club_assignment_history, public.clubs, public.zones

### Community 202 - "page.tsx"
Cohesion: 0.25
Nodes (4): LOG_VARIANT, SyncLogRow, WEBHOOK_VARIANT, WebhookRow

## Knowledge Gaps
- **681 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+676 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createAdminClient()` connect `createAdminClient` to `index.ts`, `build-activity-report.js`, `index.ts`, `requirePermission`, `requireDistrictGovernor`, `server.ts`, `lions.ts`, `requireZoneChair`, `requireAdmin`, `loadOidcSettings`, `card.tsx`, `invoices.ts`, `env.ts`, `utils.ts`, `route.ts`, `auth.ts`, `route.ts`, `portal-session.ts`, `integrations-registry.ts`, `CardHeader`, `loadLionsApiSettings`, `engine.ts`, `LionsYearCalendar.tsx`, `clientIp`, `multi-district-portal.ts`, `requireRegionChair`, `push.ts`, `sendEmail`, `page.tsx`, `formatINRShort`, `getCurrentMember`, `GreetingComposer.tsx`, `default-district.ts`, `page.tsx`, `page.tsx`, `ZoneTabs.tsx`, `club-health.ts`, `GovernanceConsole.tsx`, `page.tsx`, `route.ts`, `ActionItemsBoard.tsx`, `compliance.ts`, `page.tsx`, `billing.ts`, `page.tsx`, `dedupe.ts`, `page.tsx`, `zone-awards.ts`, `MinutesBoard.tsx`, `page.tsx`, `page.tsx`, `AgendaBoard.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `cron-auth.ts`, `index.ts`, `page.tsx`, `loadVapidConfig`, `layout.tsx`, `page.tsx`, `page.tsx`, `route.ts`, `route.ts`, `route.ts`, `route.ts`, `route.ts`, `route.ts`, `route.ts`, `page.tsx`?**
  _High betweenness centrality (0.246) - this node is a cross-community bridge._
- **Why does `createClient()` connect `server.ts` to `requirePermission`, `requireAdmin`, `quick-add-presets.ts`, `utils.ts`, `route.ts`, `auth.ts`, `route.ts`, `loadLionsApiSettings`, `PageHero.tsx`, `page.tsx`, `guard.ts`, `Footer.tsx`, `formatINRShort`, `page.tsx`, `getCurrentMember`, `default-district.ts`, `page.tsx`, `isDevAuthBypass`, `isSupabaseConfigured`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `layout.tsx`, `page.tsx`, `page.tsx`, `route.ts`, `route.ts`, `route.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `PDFDocument` connect `build-activity-report.js` to `sendEmail`, `invoices.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _690 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05805609915198956 - nodes in this community are weakly interconnected._
- **Should `build-activity-report.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05201292976785189 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07884615384615384 - nodes in this community are weakly interconnected._