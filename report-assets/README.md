# Service Activities Report

Generates a professional, print-ready PDF of the club's service activities —
a branded cover with summary KPIs, a contents page **grouped by Lions cause
area**, a divider page per cause with its subtotals, and **one full page per
activity** with all details, an editable photo, and a written report.

## Generate

```bash
# 1. export "Service Activities Information" to activities.json (2D array,
#    row 0 = header) — or reuse the parser in scripts/ for the .xlsx
node scripts/build-activity-report.js <activities.json> <out.pdf> [photosDir]

# defaults:
#   activities.json -> /tmp/activities.json
#   out.pdf         -> /tmp/Activity-Report.pdf
#   photosDir       -> report-assets/photos
```

## Editable photos (per activity / per cause)

Each activity page has a photo. Add images to `report-assets/photos/` and
re-run — no code changes needed. Lookup order for each activity:

1. `photos/<NN>.jpg` — by report number, e.g. `01.jpg`, `02.png`
   (see `photos/_INDEX.md` for the exact number → activity mapping)
2. `photos/<title-slug>.jpg` — e.g. `food-for-hunger.jpg`
3. `photos/causes/<cause-slug>.jpg` — a shared fallback for the whole cause,
   e.g. `causes/hunger-relief.jpg`, `causes/childhood-cancer.jpg`

Where no image is found, the page shows a dashed placeholder naming the exact
file to drop in. Supported: `.jpg .jpeg .png`. Images are centre-cropped to
fill the slot, so any orientation works.

## Cause grouping

Spreadsheet causes are mapped to the website's "Lions Global Causes" naming:

| Spreadsheet cause | Report / website cause |
| --- | --- |
| Hunger | Hunger Relief |
| Childhood Cancer | Childhood Cancer |
| Diabetes | Diabetes |
| Other Humanitarian Service | Humanitarian Service |
| Youth | Youth |
| Administration | Club Administration |

Edit `CAUSE_MAP` / `CAUSE_ORDER` in `scripts/build-activity-report.js` to add
Vision, Environment, Disaster Relief, etc. as new activities are logged.
