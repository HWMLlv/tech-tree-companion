import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
 ...obsidianmd.configs.recommended,
 {ignores:['node_modules/**','dist/**','test/**','runtime/**','**/*.mjs','**/*.cjs']},
 // Obsidian is supplied by the host, not a runtime npm module. The virtual
 // worker module is resolved by the named esbuild plugin in build.mjs.
 {files:['src/**/*.js'],settings:{'import/core-modules':['obsidian'],'import/ignore':['^virtual:']},rules:{
  'import/no-unresolved':['error',{ignore:['^virtual:']}]
 }}
];
