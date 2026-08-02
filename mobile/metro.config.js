// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude native build artifacts to prevent file watcher errors on Windows
config.resolver.blockList = [
  /.*\/android\/\.cxx\/.*/,
  /.*\/android\/build\/.*/,
  /.*\/ios\/build\/.*/,
];

module.exports = config;
