---
"@tindalabs/blindspot-react": patch
---

Declare `react-router-dom` as an optional peer dependency, `^6 || ^7`, for the `/react-router` entry. It was marked optional but never declared, so package managers ignored it: the entry gave no supported version, and strict layouts such as Yarn PnP refused the import. Both majors are now tested in CI. The README also showed `BlindspotRoutes` imported from the main entry, which does not export it; it is imported from `@tindalabs/blindspot-react/react-router`.
