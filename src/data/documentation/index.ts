// Documentation Data Index
// This module exports all documentation data for the /docs page

// Core exports (avoid conflicts by not using star exports for overlapping files)
export { ARCHITECTURE_SECTIONS } from './architecture';
export { ALL_TABLES, TABLE_CATEGORIES_NAV, type TableDoc, type TableColumn, type TableRelation } from './tables';
export { ALL_EDGE_FUNCTIONS, EDGE_FUNCTION_CATEGORIES, type EdgeFunctionDoc, type EdgeFunctionParam } from './edgeFunctions';
export { ALL_HOOKS, HOOK_CATEGORIES, type HookDoc, type HookParam, type HookReturn } from './hooks';
export { ALL_COMPONENTS, COMPONENT_CATEGORIES, type ComponentDoc } from './components';
export { ALL_SERVICES, SERVICE_CATEGORIES, type ServiceDoc, type ServiceMethod } from './services';
export { ALL_CONTEXTS, CONTEXT_CATEGORIES, type ContextDoc, type ContextValue } from './contexts';
export { ALL_CONFIGS, CONFIG_CATEGORIES, type ConfigDoc, type ConfigValue } from './config';

// Extended documentation (for Docs page - includes ALL items)
export * from './tablesComplete';
export * from './edgeFunctionsComplete';
export * from './hooksComplete';
export * from './componentsComplete';
export * from './utilities';
export * from './apiFlows';
