/**
 * Central Feature Flag configuration for application modules.
 * Toggles modules on or off dynamically via configuration or .env variables.
 */
export const MODULES_CONFIG = {
  inventory: {
    enabled: import.meta.env.VITE_ENABLE_INVENTORY !== 'false', // Enabled by default, set to 'false' to disable
  },
  orders: {
    enabled: import.meta.env.VITE_ENABLE_ORDERS !== 'false', // Enabled by default, set to 'false' to disable
  },
  finances: {
    enabled: import.meta.env.VITE_ENABLE_FINANCES !== 'false', // Enabled by default, set to 'false' to disable
  },
};
