const modules = Object.freeze({
  finance: Object.freeze({
    key: 'finance',
    name: 'Finance',
    implemented: false,
  }),
  productivity: Object.freeze({
    key: 'productivity',
    name: 'Productivity',
    implemented: false,
  }),
  health: Object.freeze({
    key: 'health',
    name: 'Health',
    implemented: false,
  }),
  journal: Object.freeze({
    key: 'journal',
    name: 'Journal',
    implemented: false,
  }),
});

export const getModuleDefinition = (moduleKey) => modules[moduleKey] ?? null;

export const listModuleDefinitions = () =>
  Object.values(modules).map((definition) => ({ ...definition }));
