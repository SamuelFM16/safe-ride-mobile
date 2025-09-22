const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure for React Native production
config.resolver.platforms = ['native', 'android', 'ios', 'web'];
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Remove any Expo Router configurations
config.resolver.alias = {};

module.exports = config;