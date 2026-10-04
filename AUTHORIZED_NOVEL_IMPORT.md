# Authorized full-novel import

This importer is for novel text you are authorized to republish.

## Input layout

Create:

```
authorized-import/
  my-book/
    book.json
    chapters/
      1.txt
      2.txt
      3.txt
```

`book.json` example:

```json
{
  "title": "Example Novel",
  "status": "Completed",
  "finalChapter": 3,
  "author": "Author",
  "genres": ["System", "Urban", "Revenge"],
  "summary": "Short synopsis.",
  "sourceSite": "Authorized Source",
  "attribution": "Republished by Xender with permission."
}
```

Chapter files may be `.txt`, `.md`, or JSON with `{"title":"Chapter 1","body":"..."}`.

## Run

```
node scripts/import-authorized-novels.mjs --input authorized-import --output public/novel-data
```

The importer rejects ongoing books, missing chapter numbers, empty chapters, and mismatched final chapter counts. It packs content into 50-chapter JSON chunks so static hosting does not need thousands of individual chapter files.
