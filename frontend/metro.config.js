// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Tamagui configuration
config.resolver.alias = {
  '@tamagui/core': '@tamagui/core',
  '@tamagui/config': '@tamagui/config',
  '@tamagui/animations-react-native': '@tamagui/animations-react-native',
};

// Add CORS configuration
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      return middleware(req, res, next);
    };
  }
};

// Optimize for development
config.maxWorkers = 2;

module.exports = config;
