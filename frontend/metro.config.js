const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all platforms are supported
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Configure for React Native
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;