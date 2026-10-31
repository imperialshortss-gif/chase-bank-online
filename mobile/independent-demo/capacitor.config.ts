import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.independent.accountdemo',
  appName: 'Account Demo',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
};

export default config;
