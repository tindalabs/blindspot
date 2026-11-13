---
'@tindalabs/blindspot-core': patch
'@tindalabs/blindspot': patch
'@tindalabs/blindspot-react': patch
'@tindalabs/blindspot-vue': patch
'@tindalabs/blindspot-svelte': patch
'@tindalabs/blindspot-next': patch
---

Type declarations now resolve correctly in every TypeScript module resolution mode.

- `@tindalabs/blindspot-svelte`: CommonJS consumers using `moduleResolution: "node16"` or `"nodenext"` received the ESM declarations for the CommonJS build. They now get `index.d.cts`.
- `@tindalabs/blindspot-react/react-router`: projects using `moduleResolution: "node"` found no types for this subpath. They do now.
- All packages: each `import` and `require` condition names its own declaration file. The previous `types` condition came last and was never matched; types resolved only through files that happened to sit next to the JavaScript.
