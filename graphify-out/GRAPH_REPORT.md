# Graph Report - .  (2026-07-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2728 nodes · 6954 edges · 203 communities (157 shown, 46 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.73)
- Token cost: 199,376 input · 15,212 output

## Graph Freshness
- Built from commit: `d2a7305a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Report Generation
- Activity Report Builder
- CSV Import Adapters
- Permission Guards & Audit
- District Dashboard
- Club Officers & Audit
- Lions Sync Hub
- Zone Chair Portal API
- Admin Beneficiary API
- OIDC Auth Setup
- Generic Entity Admin API
- Admin Settings Cards
- Invoice Payment Page
- Admin Directory Pages
- App Root Config
- Activity Gallery & Blog Admin
- Generic CRUD API Helpers
- Core DB Types & Auth
- PhonePe Payment Webhook
- Portal Login & Preferences
- Integrations Setup
- Admin Invoice Management
- Webhook Secrets & Encryption
- Job Automation Engine
- TypeScript Config
- Region/MD Calendar
- Payment Proof OCR
- Public About Pages
- Multi-District Dashboard
- Slide Deck Builder
- Region Dashboard
- Public Home Page
- Authorization Permissions
- Dev Dependencies Config
- Push Notifications
- Operations Search Page
- Donor Pack Generation
- Mobile Home Dashboard
- Public Site Footer
- Campaigns & Donations
- Blog Detail Page
- Core Package Dependencies
- Mobile Events & Voting
- Greeting Composer
- District Bootstrap Logic
- Automation Board
- Zone Analytics
- Production DB Schema
- Enterprise CRM Migration
- Zone Profile Pages
- Club Health Assessment
- AI Creative Builder
- Governance Console
- Beneficiary Profile Forms
- CSV Parsing Utility
- Action Items Board
- Dues Compliance
- Sync Queue Monitoring
- Dues Billing Cycle
- PhonePe Payment Client
- Portal Login Pages
- Auth Sign In/Up
- Public Sitemap & Featured
- Initial DB Schema
- Dues Billing Panel
- Member Deduplication
- Zone Dashboard
- Zone Awards Eligibility
- Meeting Minutes Board
- Reporting Engine Schema
- Advisory Voting
- Zone Approvals
- Meeting Agenda Board
- Blog Post Editor
- AI Greeting Generation
- District Circulars
- Mobile Directory
- Package Manifest
- Smoke Test Script
- Diagnostics Page
- Cron Auth Setup
- AI Video Generation
- Club Map View
- Mobile Activity Logging
- Mobile Greetings Page
- Region/MD Layout Headers
- Payment Client UI
- ICS Calendar Export
- OIDC Provider Setup
- Push VAPID Setup
- Blog Explorer Page
- Contact Page
- Donate Page
- Impact Stats Page
- Dues Tier Schema
- Admin Dashboard Charts
- Admin Layout Shell
- Admin Media Manager
- Entity Sync Queue
- Mobile App Shell
- Mobile Push Notifications
- Events Listing Page
- Media Explorer Page
- Zone/Region Portal Pages
- JWKS ID Token Verification
- Payment Invoices Schema
- Beneficiary Search Page
- Admin Roles API
- Bill OCR Extraction
- Cron Settings API
- OpenAI Key Settings API
- Signed File Upload
- Lookup Page
- Club Insights Generation
- OIDC Settings API
- Social Creative Schema
- District Circulars Schema
- Public Site Content Schema
- A-19 Docx Builder
- A-19 PPTX Builder
- Broadcast Composer
- Lions API Setup Form
- Sync Uploader
- Generic API Route Validation
- File Upload API
- Mobile Check-in Scanner
- Federation Hierarchy Schema
- Activity Approval Trigger
- Blog Storytelling Schema
- Lions Webhook Sync Schema
- Pending Migrations Apply
- PR Migration Apply
- Vercel Deployment Config
- Zone Layout Components
- Testimonials Carousel
- Agent Commissions Schema
- Photo Captions Schema
- Zone Chairperson Schema
- Club Governance Schema
- Rising Star Menu
- Refunds Schema
- Recurring Invoices Schema
- Zone Meeting Minutes Automation
- Lions Sandbox Settings
- Advisory Voting Schema
- Sync Queue Schema
- Campaigns Table Creation
- Photos Table Creation
- Site Counters Table
- ESLint Configuration
- Next.js Configuration
- PDF Generation Library
- Radix Dialog Dependency
- Radix Dropdown Dependency
- Radix Label Dependency
- Radix Select Dependency
- Radix Slot Dependency
- React Dependency
- React DOM Dependency
- Resend Email Dependency
- Supabase SSR Dependency
- Supabase Client Dependency
- Twilio SMS Dependency
- Web Push Dependency
- PostCSS Configuration
- Service Worker
- Deployment Shell Script
- Portal OTP Codes Schema
- Customer Preferences Schema
- Push Subscriptions Schema
- Zone Agenda Schema
- Lions Calendar Schema
- Zone Action Items Schema
- Lions OIDC Settings Schema
- Lions API Settings Schema
- Cron Settings Schema
- District Governor Schema
- MD Council Chair Schema
- Push Settings Schema
- Clubs Geo Schema
- Donor Tax Packs Schema
- TB Kit Distribution Migration
- Newsletter Subscribers Table
- Sync & Webhook Dashboard

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

### Community 0 - "Report Generation"
Cohesion: 0.06
Nodes (125): pptxgenjs, pptxgenjs, doc, period, doc, period, GenerateReportForm(), MONTHS (+117 more)

### Community 1 - "Activity Report Builder"
Cohesion: 0.05
Nodes (71): activityPage(), acts, args, buildLead(), capitalize(), CAUSE_MAP, CAUSE_ORDER, causeDivider() (+63 more)

### Community 2 - "CSV Import Adapters"
Cohesion: 0.08
Nodes (47): ALLOWED, POST(), POST(), Body, POST(), csvActivitiesAdapter, RowSchema, csvAttendanceAdapter (+39 more)

### Community 3 - "Permission Guards & Audit"
Cohesion: 0.11
Nodes (41): GET(), POST(), GET(), POST(), friendlyError(), GET(), POST(), GET() (+33 more)

### Community 4 - "District Dashboard"
Cohesion: 0.08
Nodes (32): createSchema, GET(), POST(), GET(), GET(), POST(), DistrictCalendarPage(), Props (+24 more)

### Community 5 - "Club Officers & Audit"
Cohesion: 0.07
Nodes (32): actionTone(), AuditPage(), AuditRow, AutomationPage(), ROLES, Club, ClubOfficersPage(), MemberRef (+24 more)

### Community 6 - "Lions Sync Hub"
Cohesion: 0.09
Nodes (37): LionsHubPage(), LionsSyncPanel(), SyncReport, LionsSyncPage(), GET(), POST(), RunRow, DistrictSyncResult (+29 more)

### Community 7 - "Zone Chair Portal API"
Cohesion: 0.06
Nodes (40): DELETE(), PATCH(), patchSchema, createSchema, GET(), POST(), POST(), schema (+32 more)

### Community 8 - "Admin Beneficiary API"
Cohesion: 0.06
Nodes (36): POST(), schema, DELETE(), GET(), PATCH(), DELETE(), POST(), GET() (+28 more)

### Community 9 - "OIDC Auth Setup"
Cohesion: 0.12
Nodes (32): OidcSetupPage(), clearTransientCookies(), GET(), GET(), GET(), POST(), GET(), pickProfile() (+24 more)

### Community 10 - "Generic Entity Admin API"
Cohesion: 0.07
Nodes (28): DELETE(), GET(), PATCH(), patchSchema, PATCH(), patchSchema, GET(), Body (+20 more)

### Community 11 - "Admin Settings Cards"
Cohesion: 0.09
Nodes (23): CronSecretCard(), Props, MODELS, OpenAiSettingsForm(), Props, Props, PushKeyCard(), PushBroadcastForm() (+15 more)

### Community 12 - "Invoice Payment Page"
Cohesion: 0.13
Nodes (29): qrcode, qrcode, GET(), POST(), GET(), GET(), GET(), generateMetadata() (+21 more)

### Community 13 - "Admin Directory Pages"
Cohesion: 0.10
Nodes (24): AdminActivitiesPage(), ClubsPage(), DistrictRow, DistrictsPage(), AdminEventsPage(), MembersPage(), SocialPage(), DistrictRef (+16 more)

### Community 14 - "App Root Config"
Cohesion: 0.10
Nodes (23): POST(), POST(), metadata, viewport, env, integrations, parsed, schema (+15 more)

### Community 15 - "Activity Gallery & Blog Admin"
Cohesion: 0.09
Nodes (22): ActivityGallery(), nowMs(), Props, Tab, ActivityDetailPage(), AdminBlogIndex(), Row, CommissionActions() (+14 more)

### Community 16 - "Generic CRUD API Helpers"
Cohesion: 0.10
Nodes (31): logUsage(), POST(), schema, baseSchema, DELETE(), friendlyError(), normalisePayload(), OpResult (+23 more)

### Community 17 - "Core DB Types & Auth"
Cohesion: 0.07
Nodes (31): csv(), GET(), csvCell(), csvLine(), GET(), BYPASS_MEMBER, Activity, AttendanceStatus (+23 more)

### Community 18 - "PhonePe Payment Webhook"
Cohesion: 0.13
Nodes (28): POST(), POST(), SETTLEABLE, POST(), POST(), PUT(), POST(), PhonePeEvent (+20 more)

### Community 19 - "Portal Login & Preferences"
Cohesion: 0.11
Nodes (24): POST(), GET(), PATCH(), schema, metadata, PortalLoginPage(), PortalLoginForm(), metadata (+16 more)

### Community 20 - "Integrations Setup"
Cohesion: 0.12
Nodes (25): OpenAiSetupPage(), CATEGORY_META, CATEGORY_ORDER, IntegrationsPage(), Props, QuickEnableSandbox(), GET(), fromEnv() (+17 more)

### Community 21 - "Admin Invoice Management"
Cohesion: 0.09
Nodes (19): BulkInvoiceCard(), CreateResult, Preview, NewInvoiceCard(), AdminPaymentsPage(), InvoiceRow, Proof, safe() (+11 more)

### Community 22 - "Webhook Secrets & Encryption"
Cohesion: 0.14
Nodes (25): DELETE(), PUT(), upsertSchema, POST(), getWebhookSecret(), LionsEvent, POST(), verify() (+17 more)

### Community 23 - "Job Automation Engine"
Cohesion: 0.13
Nodes (24): POST(), GET(), POST(), advance(), enqueueJob(), expireStaleInvoices(), handlers, JobHandler (+16 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, ./src/* (+21 more)

### Community 25 - "Region/MD Calendar"
Cohesion: 0.13
Nodes (21): GET(), MdCalendarPage(), Props, Props, RegionCalendarPage(), CATEGORIES, empty(), EventEditor() (+13 more)

### Community 26 - "Payment Proof OCR"
Cohesion: 0.17
Nodes (20): POST(), POST(), schema, normalizePhone(), POST(), handleJson(), handleMultipart(), POST() (+12 more)

### Community 27 - "Public About Pages"
Cohesion: 0.10
Nodes (18): AboutPage(), avatar(), JOURNEY, LEADERS, metadata, STATS, VALUES, Cause (+10 more)

### Community 28 - "Multi-District Dashboard"
Cohesion: 0.16
Nodes (16): GET(), MdDistrictsPage(), MdTabs(), TABS, AdvisoryRow, MdNotificationsPage(), MultiDistrictDashboard(), MdProfilePage() (+8 more)

### Community 29 - "Slide Deck Builder"
Cohesion: 0.16
Nodes (26): Canvas, _arc_text(), build(), bullets(), draw_background(), draw_district_emblem(), draw_footer(), draw_header() (+18 more)

### Community 30 - "Region Dashboard"
Cohesion: 0.17
Nodes (15): GET(), RegionNotificationsPage(), RegionDashboard(), RegionProfilePage(), RegionTabs(), TABS, RegionReportsPage(), RegionZonesPage() (+7 more)

### Community 31 - "Public Home Page"
Cohesion: 0.10
Nodes (18): getRecentActivities(), getStats(), HomePage(), metadata, AboutSection(), COLLAGE, TAGS, DonateCTABanner() (+10 more)

### Community 32 - "Authorization Permissions"
Cohesion: 0.14
Nodes (20): GET(), currentActor(), legacyToLions(), ActorScope, authorize(), can(), canActOnScope(), MATRIX (+12 more)

### Community 33 - "Dev Dependencies Config"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx (+17 more)

### Community 34 - "Push Notifications"
Cohesion: 0.15
Nodes (21): NotificationsPage(), POST(), schema, GET(), POST(), schema, broadcastPush(), broadcastToTopic() (+13 more)

### Community 35 - "Operations Search Page"
Cohesion: 0.14
Nodes (17): OperationsSearch(), filterActions(), isAvailable(), MODE_META, OperationsPage(), Props, CATEGORY_LINKS, FEATURED_KEYS (+9 more)

### Community 36 - "Donor Pack Generation"
Cohesion: 0.13
Nodes (18): Body, MemberRow, POST(), GET(), POST(), DonationRow, DonorGroup, donorPackEmail() (+10 more)

### Community 37 - "Mobile Home Dashboard"
Cohesion: 0.17
Nodes (19): CLUB_RANK, MyClub(), OfficerRow, DISTRICT_RANK, MyDistrict(), OfficerRow, COURSES, DISTRICT_RANK (+11 more)

### Community 38 - "Public Site Footer"
Cohesion: 0.10
Nodes (10): FOCUS_AREAS, Footer(), getVisitorCount(), PageViewBeacon(), Cause, CAUSES, NAV, NavItem (+2 more)

### Community 39 - "Campaigns & Donations"
Cohesion: 0.12
Nodes (16): ClubDetailPage(), Campaign, CampaignCard(), CampaignsPage(), Donation, EmptyCampaigns(), FeaturedCampaign(), loadCampaigns() (+8 more)

### Community 40 - "Blog Detail Page"
Cohesion: 0.18
Nodes (16): BlogDetailPage(), BlogPost, generateMetadata(), getPost(), getRelated(), generateMetadata(), getStory(), Story (+8 more)

### Community 41 - "Core Package Dependencies"
Cohesion: 0.11
Nodes (20): class-variance-authority, clsx, lucide-react, next, dependencies, class-variance-authority, clsx, lucide-react (+12 more)

### Community 42 - "Mobile Events & Voting"
Cohesion: 0.13
Nodes (13): AdvisoryVotingRow, GET(), POST(), schema, VoteRow, POST(), schema, EventRow (+5 more)

### Community 43 - "Greeting Composer"
Cohesion: 0.11
Nodes (14): GreetingComposer(), Lang, LANGS, MemberLite, Occasion, OCCASIONS, Props, splitLine() (+6 more)

### Community 44 - "District Bootstrap Logic"
Cohesion: 0.21
Nodes (15): GET(), POST(), friendlyError(), GET(), POST(), schema, BootstrapResult, currentLionsYear() (+7 more)

### Community 45 - "Automation Board"
Cohesion: 0.20
Nodes (14): defaultConfig(), GET(), PUT(), upsertSchema, AutomationBoard(), AutomationRow, nowMs(), Props (+6 more)

### Community 46 - "Zone Analytics"
Cohesion: 0.18
Nodes (13): ZoneAnalyticsPage(), Props, shortName(), ZoneAnalyticsCharts(), ClubAnalytics, getZoneAnalytics(), linfit(), MonthlySeries (+5 more)

### Community 47 - "Production DB Schema"
Cohesion: 0.20
Nodes (18): public.attendance, public.audit_logs, public.awards, public.clubs, public.committee_members, public.committees, public.districts, public.integrations (+10 more)

### Community 48 - "Enterprise CRM Migration"
Cohesion: 0.20
Nodes (18): public.attendance, public.audit_logs, public.awards, public.clubs, public.committee_members, public.committees, public.districts, public.integrations (+10 more)

### Community 49 - "Zone Profile Pages"
Cohesion: 0.16
Nodes (11): ChangePasswordForm(), State, metadata, ProfilePage(), isoSince(), ZoneAttendancePage(), ZoneNotificationsPage(), ZoneProfilePage() (+3 more)

### Community 50 - "Club Health Assessment"
Cohesion: 0.20
Nodes (16): GET(), POST(), schema, aiClubCommentary(), assessAllClubs(), assessClubHealth(), assessFromClub(), assessZoneClubs() (+8 more)

### Community 51 - "AI Creative Builder"
Cohesion: 0.16
Nodes (12): AiOutput, ContentType, CreativeBuilder(), Platform, PLATFORMS, TYPES, Button, ButtonProps (+4 more)

### Community 52 - "Governance Console"
Cohesion: 0.15
Nodes (11): CLUB_CATEGORIES, ClubRow, ClubTable(), DistrictRow, GovernanceConsole(), HistoryRow, Props, RISK_PILL() (+3 more)

### Community 53 - "Beneficiary Profile Forms"
Cohesion: 0.15
Nodes (5): BeneficiaryForm(), BeneficiaryInit, Props, BeneficiaryProfilePage(), ServiceLogForm()

### Community 54 - "CSV Parsing Utility"
Cohesion: 0.19
Nodes (13): coerceOne(), coerceRows(), numberOrNull(), ParsedRow, POST(), RowInput, stringOrNull(), POST() (+5 more)

### Community 55 - "Action Items Board"
Cohesion: 0.15
Nodes (10): ActionItemRow, ActionItemsBoard(), Channel, nowMs(), Priority, PRIORITY_META, Props, Status (+2 more)

### Community 56 - "Dues Compliance"
Cohesion: 0.28
Nodes (13): DuesPage(), GET(), AgeingBucket, ClubComplianceRow, DuesKpis, DuesTier, DuesTierBreakdown, getClubCompliance() (+5 more)

### Community 57 - "Sync Queue Monitoring"
Cohesion: 0.20
Nodes (11): formatDuration(), STATUS_VARIANT, SyncLogRow, SyncPage(), QueueActions(), countTable(), ENTITIES, EntityCoverage (+3 more)

### Community 58 - "Dues Billing Cycle"
Cohesion: 0.22
Nodes (13): POST(), schema, applyLateFees(), BillCycleOptions, BillCycleReport, computePeriod(), DuesTier, insertInvoiceIfMissing() (+5 more)

### Community 59 - "PhonePe Payment Client"
Cohesion: 0.33
Nodes (9): checkStatus(), host(), InitiateInput, initiatePayment(), InitiateResult, isConfigured(), StatusResult, xVerify() (+1 more)

### Community 60 - "Portal Login Pages"
Cohesion: 0.19
Nodes (5): Props, Props, Props, Props, ZoneLoginForm()

### Community 61 - "Auth Sign In/Up"
Cohesion: 0.21
Nodes (9): ActionResult, signInAction(), signUpAction(), LoginForm(), LoginPage(), isDevAuthBypass(), config, proxy() (+1 more)

### Community 62 - "Public Sitemap & Featured"
Cohesion: 0.22
Nodes (10): dynamicEntries(), sitemap(), Featured, FeaturedActivities(), getCategoryCounts(), EventRow, formatDateParts(), getUpcoming() (+2 more)

### Community 63 - "Initial DB Schema"
Cohesion: 0.29
Nodes (12): public.activities, public.automation_jobs, public.clubs, public.communications, public.current_member(), public.donations, public.dues, public.event_rsvps (+4 more)

### Community 64 - "Dues Billing Panel"
Cohesion: 0.18
Nodes (9): BillCyclePanel(), BillReport, Props, RateCard, DuesTabs(), TABS, Props, Tier (+1 more)

### Community 65 - "Member Deduplication"
Cohesion: 0.24
Nodes (12): DuplicatesPage(), addPairs(), aiClassifyPair(), AiVerdict, bucket(), CandidatePair, DuplicateRow, findCandidatePairs() (+4 more)

### Community 66 - "Zone Dashboard"
Cohesion: 0.24
Nodes (6): GET(), ZoneClubsPage(), ZoneDashboard(), getClubScores(), getZoneAlerts(), getZoneKpis()

### Community 67 - "Zone Awards Eligibility"
Cohesion: 0.21
Nodes (10): fmt(), ZoneAwardsPage(), AwardCriterion, AwardScore, CLUB_EXCELLENCE, ClubAwards, DG_HONOR, getZoneAwardEligibility() (+2 more)

### Community 68 - "Meeting Minutes Board"
Cohesion: 0.21
Nodes (8): ActionItem, empty(), MinutesBoard(), MinutesEditor(), MinutesItem, Props, toLocal(), ZoneMinutesPage()

### Community 69 - "Reporting Engine Schema"
Cohesion: 0.21
Nodes (11): public.activities, public.award_qualifications, public.beneficiaries, public.beneficiary_services, public.csr_partners, public.medical_camp_records, public.report_schedules, public.reports (+3 more)

### Community 70 - "Advisory Voting"
Cohesion: 0.20
Nodes (8): AdvisoryComposer(), Props, AdvisoryVoteCard(), Props, TallyRow, VoterRow, Props, ZoneAdvisoriesPage()

### Community 71 - "Zone Approvals"
Cohesion: 0.20
Nodes (5): ApprovalActions(), ApprovalToggle(), Props, Pending, ZoneApprovalsPage()

### Community 72 - "Meeting Agenda Board"
Cohesion: 0.21
Nodes (9): AgendaBoard(), AgendaCard(), AgendaItem, AgendaStatus, Props, STATUS_META, STATUS_ORDER, toLocal() (+1 more)

### Community 73 - "Blog Post Editor"
Cohesion: 0.25
Nodes (7): EditBlogPostPage(), Row, EMPTY, NewBlogPostPage(), BlogEditor(), BlogPostForm, CATEGORIES

### Community 74 - "AI Greeting Generation"
Cohesion: 0.22
Nodes (10): fallbackTemplate(), hashtags(), Lang, LANG_INSTRUCTION, Occasion, OCCASION_BRIEF, POST(), schema (+2 more)

### Community 75 - "District Circulars"
Cohesion: 0.20
Nodes (6): Channel, CHANNELS, CircularComposer(), Props, CircularRow, DistrictCircularsPage()

### Community 76 - "Mobile Directory"
Cohesion: 0.20
Nodes (5): DirectoryTabs(), TABS, MobileDirectory(), OfficerRow, Props

### Community 77 - "Package Manifest"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, typecheck (+1 more)

### Community 78 - "Smoke Test Script"
Cohesion: 0.22
Nodes (6): BASE_URL, check(), guardedReadEndpoints, guardedWriteEndpoints, record(), results

### Community 79 - "Diagnostics Page"
Cohesion: 0.31
Nodes (7): DiagnosticsPage(), mask(), probeAdmin(), ProbeResult, probeRpc(), probeSsrSelect(), projectRef()

### Community 80 - "Cron Auth Setup"
Cohesion: 0.33
Nodes (7): CronSetupPage(), GET(), GET(), loadCronSecret(), peekCronSecret(), timingSafeEqual(), verifyCronAuth()

### Community 81 - "AI Video Generation"
Cohesion: 0.27
Nodes (8): POST(), videoGenerateSchema, ASPECT_DIMENSIONS, generateVideo(), signCloudinary(), VideoRequest, VideoResult, VideoScene

### Community 82 - "Club Map View"
Cohesion: 0.27
Nodes (8): ClubMap(), ClubPin, ensureLeaflet(), LeafletMap, LeafletNS, pinColor(), Props, Window

### Community 83 - "Mobile Activity Logging"
Cohesion: 0.24
Nodes (5): CATEGORIES, LogActivityForm(), PhotoItem, PhotoMultiUpload(), Props

### Community 84 - "Mobile Greetings Page"
Cohesion: 0.33
Nodes (8): ageOn(), daysUntil(), isToday(), isUpcoming(), MemberRow, mmdd(), MobileGreetings(), PersonRow()

### Community 85 - "Region/MD Layout Headers"
Cohesion: 0.29
Nodes (5): MultiDistrictLayout(), MdHeader(), RegionLayout(), RegionHeader(), MobileSyncBanner()

### Community 86 - "Payment Client UI"
Cohesion: 0.24
Nodes (7): formatRemaining(), OcrInfo, PaymentClient(), ProofState, Props, useCountdown(), Window

### Community 87 - "ICS Calendar Export"
Cohesion: 0.33
Nodes (8): RFC-5545, buildIcs(), escapeText(), fmtDate(), fmtUtc(), fold(), IcsCalendar, IcsEvent

### Community 88 - "OIDC Provider Setup"
Cohesion: 0.36
Nodes (6): OidcSetupForm(), Props, SettingsRow, findPreset(), OIDC_PROVIDER_PRESETS, OidcProviderPreset

### Community 89 - "Push VAPID Setup"
Cohesion: 0.39
Nodes (8): PushSetupPage(), GET(), maskKey(), POST(), PUT(), upsertSchema, invalidateVapidCache(), loadVapidConfig()

### Community 90 - "Blog Explorer Page"
Cohesion: 0.28
Nodes (7): BlogPost, CURATED, FeaturedStory(), metadata, BlogExplorer(), BlogStory, CATEGORY_STYLES

### Community 91 - "Contact Page"
Cohesion: 0.25
Nodes (5): ContactForm(), State, TOPICS, MAP_QUERY, metadata

### Community 92 - "Donate Page"
Cohesion: 0.25
Nodes (6): DonateForm(), PRESETS, Window, IMPACT, metadata, OTHER_WAYS

### Community 93 - "Impact Stats Page"
Cohesion: 0.28
Nodes (7): CauseAggRow, ImpactPage(), loadImpact(), metadata, StatCard(), Counter(), FormatStyle

### Community 94 - "Dues Tier Schema"
Cohesion: 0.33
Nodes (8): public.dues, public.dues_installments, public.dues_invoices, public.dues_payments, public.dues_penalties, public.dues_rate_cards, set_dues_invoice_no, set_updated_dues_invoices

### Community 95 - "Admin Dashboard Charts"
Cohesion: 0.39
Nodes (5): ActivitiesByCategoryChart(), DonationTrendChart(), MembershipPieChart(), AdminDashboard(), getDashboardData()

### Community 96 - "Admin Layout Shell"
Cohesion: 0.39
Nodes (5): AdminLayout(), navItems, LogoutButton(), requireSupabaseEnv(), createClient()

### Community 97 - "Admin Media Manager"
Cohesion: 0.29
Nodes (4): DeletePhotoButton(), AdminMediaPage(), Photo, CATEGORIES

### Community 98 - "Entity Sync Queue"
Cohesion: 0.32
Nodes (5): EntitySyncPage(), LedgerRow, QueueRow, VALID, RetryJobButton()

### Community 99 - "Mobile App Shell"
Cohesion: 0.32
Nodes (5): metadata, MobileLayout(), MobileServiceWorker(), MobileTabBar(), TABS

### Community 100 - "Mobile Push Notifications"
Cohesion: 0.29
Nodes (3): MobileProfile(), PushToggle(), Status

### Community 101 - "Events Listing Page"
Cohesion: 0.32
Nodes (7): EventCard(), EventRow, EventsPage(), FALLBACK_IMAGES, fmtDate(), fmtTime(), metadata

### Community 102 - "Media Explorer Page"
Cohesion: 0.32
Nodes (5): COVERAGE, metadata, MediaExplorer(), MediaItem, TYPE_META

### Community 103 - "Zone/Region Portal Pages"
Cohesion: 0.54
Nodes (4): RegionPortalPage(), isLionsApiConfigured(), isOidcConfiguredFlag(), ZoneLionsPortalPage()

### Community 104 - "JWKS ID Token Verification"
Cohesion: 0.32
Nodes (7): ALG_TO_DIGEST, base64urlDecode(), Jwk, JwksResponse, loadKeys(), VerifiedIdToken, verifyIdToken()

### Community 105 - "Payment Invoices Schema"
Cohesion: 0.46
Nodes (7): public.invoices, public.payment_audit_logs, public.payment_proofs, public.payments, public.qr_codes, public.set_updated_at(), trg_invoices_updated_at

### Community 106 - "Beneficiary Search Page"
Cohesion: 0.33
Nodes (4): BeneficiarySearch(), Props, BeneficiariesPage(), Props

### Community 107 - "Admin Roles API"
Cohesion: 0.38
Nodes (6): Body, DELETE(), GET(), POST(), ADMIN_ROLES, isAdminRole()

### Community 108 - "Bill OCR Extraction"
Cohesion: 0.43
Nodes (5): POST(), BillItem, BillOcrResult, extractBill(), numOrNull()

### Community 109 - "Cron Settings API"
Cohesion: 0.38
Nodes (6): GET(), POST(), PUT(), randomSecret(), upsertSchema, invalidateCronCache()

### Community 110 - "OpenAI Key Settings API"
Cohesion: 0.48
Nodes (6): DELETE(), GET(), maskKey(), PUT(), upsertSchema, invalidateOpenAiCache()

### Community 111 - "Signed File Upload"
Cohesion: 0.38
Nodes (6): ALLOWED_MIME, guessExt(), maxBytesFor(), POST(), SignedItem, SignRequest

### Community 112 - "Lookup Page"
Cohesion: 0.33
Nodes (3): LookupForm(), Result, metadata

### Community 113 - "Club Insights Generation"
Cohesion: 0.47
Nodes (4): GET(), ClubInsightsInput, ClubInsightsOutput, generateClubInsights()

### Community 114 - "OIDC Settings API"
Cohesion: 0.47
Nodes (5): DELETE(), GET(), PUT(), upsertSchema, invalidateOidcSettingsCache()

### Community 115 - "Social Creative Schema"
Cohesion: 0.40
Nodes (5): public.ai_generations, public.creatives, public.social_posts, public.upcoming_birthdays, public.videos

### Community 116 - "District Circulars Schema"
Cohesion: 0.40
Nodes (5): public.circular_recipients, public.district_circulars, public.district_sync_runs, set_circular_ref, set_updated_circular

### Community 117 - "Public Site Content Schema"
Cohesion: 0.33
Nodes (5): public.blog_posts, public.campaigns, public.newsletter_subscribers, public.photos, public.site_counters

### Community 118 - "A-19 Docx Builder"
Cohesion: 0.60
Nodes (4): build(), Path, Render the PDF deck pages as PNGs and embed them into a Word (.docx).  This guar, render_pages()

### Community 119 - "A-19 PPTX Builder"
Cohesion: 0.60
Nodes (4): build(), Path, Generate the A-19 IT Chairperson presentation as A4 portrait .pptx.  Renders eac, render_pages()

### Community 120 - "Broadcast Composer"
Cohesion: 0.40
Nodes (3): ApiResult, CHANNELS, SEGMENTS

### Community 121 - "Lions API Setup Form"
Cohesion: 0.40
Nodes (3): ApiSettingsRow, LionsApiSetupForm(), Props

### Community 122 - "Sync Uploader"
Cohesion: 0.40
Nodes (3): ENTITIES, Entity, RunResult

### Community 123 - "Generic API Route Validation"
Cohesion: 0.60
Nodes (4): friendlyError(), GET(), POST(), schema

### Community 124 - "File Upload API"
Cohesion: 0.50
Nodes (4): ALLOWED_MIME, guessExt(), POST(), UploadedItem

### Community 125 - "Mobile Check-in Scanner"
Cohesion: 0.60
Nodes (3): CheckinScanner(), isoSince(), MobileCheckin()

### Community 126 - "Federation Hierarchy Schema"
Cohesion: 0.40
Nodes (4): public.districts, public.multiple_districts, public.regions, public.zones

### Community 127 - "Activity Approval Trigger"
Cohesion: 0.50
Nodes (4): public.activities, public.tg_activity_pre_approve(), public.zones, tg_activity_pre_approve

### Community 128 - "Blog Storytelling Schema"
Cohesion: 0.50
Nodes (4): public.ai_generations, public.blog_posts, public.campaigns, public.stories

### Community 129 - "Lions Webhook Sync Schema"
Cohesion: 0.40
Nodes (4): public.clubs, public.lions_api_settings, public.lions_webhook_events, public.officers

### Community 130 - "Pending Migrations Apply"
Cohesion: 0.40
Nodes (3): public.activities, public.newsletter_subscribers, public.site_counters

### Community 131 - "PR Migration Apply"
Cohesion: 0.40
Nodes (4): public.campaigns, public.photos, trg_campaigns_updated, trg_photos_updated

### Community 132 - "Vercel Deployment Config"
Cohesion: 0.40
Nodes (4): crons, framework, headers, $schema

### Community 135 - "Agent Commissions Schema"
Cohesion: 0.67
Nodes (3): public.commission_records, public.invoices, trg_commissions_updated_at

### Community 136 - "Photo Captions Schema"
Cohesion: 0.50
Nodes (3): public.activities, public.beneficiaries, public.events

### Community 137 - "Zone Chairperson Schema"
Cohesion: 0.67
Nodes (3): public.advisories, public.regions, public.zones

### Community 138 - "Club Governance Schema"
Cohesion: 0.83
Nodes (3): public.club_assignment_history, public.clubs, public.zones

### Community 202 - "Sync & Webhook Dashboard"
Cohesion: 0.25
Nodes (4): LOG_VARIANT, SyncLogRow, WEBHOOK_VARIANT, WebhookRow

## Knowledge Gaps
- **681 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+676 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createAdminClient()` connect `Generic Entity Admin API` to `Report Generation`, `Activity Report Builder`, `CSV Import Adapters`, `Permission Guards & Audit`, `District Dashboard`, `Club Officers & Audit`, `Lions Sync Hub`, `Zone Chair Portal API`, `Admin Beneficiary API`, `OIDC Auth Setup`, `Admin Settings Cards`, `Invoice Payment Page`, `App Root Config`, `Activity Gallery & Blog Admin`, `Generic CRUD API Helpers`, `Core DB Types & Auth`, `PhonePe Payment Webhook`, `Portal Login & Preferences`, `Integrations Setup`, `Admin Invoice Management`, `Webhook Secrets & Encryption`, `Job Automation Engine`, `Region/MD Calendar`, `Payment Proof OCR`, `Multi-District Dashboard`, `Region Dashboard`, `Push Notifications`, `Donor Pack Generation`, `Mobile Home Dashboard`, `Campaigns & Donations`, `Mobile Events & Voting`, `Greeting Composer`, `District Bootstrap Logic`, `Automation Board`, `Zone Analytics`, `Zone Profile Pages`, `Club Health Assessment`, `Governance Console`, `Beneficiary Profile Forms`, `CSV Parsing Utility`, `Action Items Board`, `Dues Compliance`, `Sync Queue Monitoring`, `Dues Billing Cycle`, `Dues Billing Panel`, `Member Deduplication`, `Zone Dashboard`, `Zone Awards Eligibility`, `Meeting Minutes Board`, `Advisory Voting`, `Zone Approvals`, `Meeting Agenda Board`, `Sync & Webhook Dashboard`, `District Circulars`, `Mobile Directory`, `Diagnostics Page`, `Cron Auth Setup`, `AI Video Generation`, `Mobile Greetings Page`, `Push VAPID Setup`, `Admin Layout Shell`, `Entity Sync Queue`, `Beneficiary Search Page`, `Admin Roles API`, `Cron Settings API`, `OpenAI Key Settings API`, `Signed File Upload`, `OIDC Settings API`, `Generic API Route Validation`, `File Upload API`, `Mobile Check-in Scanner`?**
  _High betweenness centrality (0.246) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Club Officers & Audit` to `Permission Guards & Audit`, `Admin Beneficiary API`, `Admin Directory Pages`, `Activity Gallery & Blog Admin`, `Generic CRUD API Helpers`, `Core DB Types & Auth`, `PhonePe Payment Webhook`, `Webhook Secrets & Encryption`, `Public About Pages`, `Public Home Page`, `Authorization Permissions`, `Public Site Footer`, `Campaigns & Donations`, `Blog Detail Page`, `Mobile Events & Voting`, `District Bootstrap Logic`, `Sync Queue Monitoring`, `Auth Sign In/Up`, `Public Sitemap & Featured`, `Blog Post Editor`, `Diagnostics Page`, `Blog Explorer Page`, `Impact Stats Page`, `Admin Dashboard Charts`, `Admin Layout Shell`, `Admin Media Manager`, `Events Listing Page`, `Admin Roles API`, `Club Insights Generation`, `Generic API Route Validation`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `PDFDocument` connect `Activity Report Builder` to `Donor Pack Generation`, `Invoice Payment Page`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _690 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Report Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.05805609915198956 - nodes in this community are weakly interconnected._
- **Should `Activity Report Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.05201292976785189 - nodes in this community are weakly interconnected._
- **Should `CSV Import Adapters` be split into smaller, more focused modules?**
  _Cohesion score 0.07884615384615384 - nodes in this community are weakly interconnected._