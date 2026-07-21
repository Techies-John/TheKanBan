# TheKanBan

Cartoon Sunday-Comic Kanban board (Vue 3 + TypeScript + Pinia).

**Live (latest official release):** [https://techies-john.github.io/TheKanBan/](https://techies-john.github.io/TheKanBan/)

## Support

Enjoying the Sunday paper? A ⭐ keeps the ink flowing — [star the repo](https://github.com/Techies-John/TheKanBan).  
Want to tip the cartoonist? [GitHub Sponsors](https://github.com/sponsors/Techies-John).

## Run locally

```powershell
cd C:\Users\johnvinj\Documents\js\TheKanBan
npm install
npm run dev
```

## Stack

- Vite + Vue 3 + TypeScript
- Pinia (board state + localStorage `thekanban:v1`)
- vue-draggable-plus (drag cards within/between columns)

## Aesthetic

Sunday Comic — cream paper, ink outlines, Comic Neue, warm orange CTAs.

## Versions & deploy

- Develop on `master` freely — pushes do **not** update the live site.
- Cut an official version: bump `package.json` version → tag `vX.Y.Z` → publish a GitHub Release.
- GitHub Actions builds that release and deploys **GitHub Pages** (release-only).
