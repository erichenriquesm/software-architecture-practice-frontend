/** Layers import only downwards: app/pages -> contexts -> entities -> shared; lastro depends on nothing of ours. */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'shared-is-the-bottom', severity: 'error', from: { path: '^src/shared/' }, to: { path: '^src/(app|pages|contexts|entities|lastro)/' } },
    { name: 'entities-above-shared-only', severity: 'error', from: { path: '^src/entities/' }, to: { path: '^src/(app|pages|contexts|lastro)/' } },
    { name: 'lastro-is-standalone', severity: 'error', from: { path: '^src/lastro/' }, to: { path: '^src/(app|pages|contexts|entities|shared)/' } },
    { name: 'contexts-below-pages', severity: 'error', from: { path: '^src/contexts/' }, to: { path: '^src/(app|pages)/' } },
    {
      name: 'no-cross-context',
      severity: 'error',
      from: { path: '^src/contexts/([^/]+)/' },
      to: { path: '^src/contexts/([^/]+)/', pathNot: '^src/contexts/$1/' },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      from: { path: '^src/contexts/[^/]+/domain/' },
      to: { path: '^src/contexts/[^/]+/(application|infra|ui)/' },
    },
    {
      name: 'ui-never-calls-the-api',
      severity: 'error',
      from: { path: '^src/contexts/[^/]+/ui/' },
      to: { path: '^src/(contexts/[^/]+/infra|shared/api)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.vue', '.js'] },
  },
};
