/**
 * Runtime Registry
 *
 * Centralized handler registration and lifecycle management.
 *
 * @module registry
 */

export {
  handlerRegistry,
  bindRegistryToCommandBus,
  validateHandlerRegistry
} from './handler-registry'
export type { RegisteredHandler, HandlerRegistryStats } from './handler-registry'
