# Import data

This directory contains editable research topics, an empty occasions list, and an empty source-import manifest. Add only material you have permission to store and cite; no historical text is seeded by the application.

## Large sources

1. Copy each local text file into `data/files/` (TXT, MD, JSON, CSV, DOCX, or text-based PDF).
2. Add a record to `sources.manifest.json` with the required title, type, and license.
3. Run `npm run import:source` from the repository root. Files are SHA-256 deduplicated; rerunning the command skips sources already imported. Imports are split into transactions of up to 50 chunks.

Example manifest entry:

```json
{
  "file": "files/history.txt",
  "title": "عنوان دقیق منبع",
  "authorEditor": "نویسنده یا مصحح",
  "type": "HISTORY",
  "yearEdition": "نسخه / سال",
  "license": "مجوز یا وضعیت حقوقی",
  "sourceUrl": "https://example.org/source",
  "notes": "یادداشت اختیاری",
  "period": "ACHAEMENID"
}
```

Supported source types: `SHAHNAMEH`, `HISTORY`, `ARCHITECTURE`, `CYRUS`, `OTHER`. Periods: `MYTHICAL`, `ACHAEMENID`, `PARTHIAN`, `SASANIAN`, `ISLAMIC`, `SAFAVID`, `AFSHARID`, `ZAND`, `QAJAR`. The web upload limit is 5 MB per file; the local importer accepts up to 100 MB. Scanned PDFs have no extractable text and require OCR before import. Keep large files out of git; use a local `data/files/` directory.

## Shahnameh JSON / CSV

Use JSON as an array, or CSV with these exact headers. Each row is one couplet and includes its story and order:

```csv
storyTitle,storyOrder,verseOrder,firstHemistich,secondHemistich
عنوان داستان,1,1,مصرع نخست,مصرع دوم
```

```json
[
  { "storyTitle": "عنوان داستان", "storyOrder": 1, "verseOrder": 1, "firstHemistich": "مصرع نخست", "secondHemistich": "مصرع دوم" }
]
```

The Shahnameh page reads only imported records. No verse is generated from model memory.

## Research topics

Edit `topics.json` to add or remove topic objects. Five starter topic labels are present; they contain no historical claims. `id` must be stable; `title`, `period`, and `queries` guide retrieval.

## Historical occasions

Edit `occasions.json` with ISO month/day strings (`MM-DD`) and a source note. The calendar never infers dates. The sample file is empty until you add sourced occasions.
