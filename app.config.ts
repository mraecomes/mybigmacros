import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'myBigMACros',
  slug: 'mybigmacros',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'mybigmacros',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#121212',
  },
  ios: {
    bundleIdentifier: 'com.mallory.mybigmacros',
    supportsTablet: true,
  },
  android: {
    package: 'com.mallory.mybigmacros',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#121212',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
});
