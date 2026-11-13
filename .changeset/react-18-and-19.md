---
"@tindalabs/blindspot-react": patch
"@tindalabs/blindspot-next": patch
---

Declare React support as `^18 || ^19` instead of `>=18`. Both majors are now tested in CI. The old range also promised React 20 and later, which nobody has run; a future major will be added once it is tested. No installation that works today is affected.
