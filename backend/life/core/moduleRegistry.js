const modules = Object.freeze({
  finance: Object.freeze({
    key: 'finance',
    name: 'Finance',
    implemented: false,
  }),
});

export const getModuleDefinition = (moduleKey) => modules[moduleKey] ?? null;

export const listModuleDefinitions = () =>
  Object.values(modules).map((definition) => ({ ...definition }));
