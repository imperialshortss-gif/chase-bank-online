import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.independent.websiteportal',
  appName: 'Website Portal',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
};

export default config;
