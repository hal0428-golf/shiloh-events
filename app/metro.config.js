// Expo's default bundler settings, plus one fix.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @noble/hashes imports '@noble/hashes/crypto', and its "browser" field rewrites that to
// './crypto.js', a path its "exports" list doesn't include. Metro then warns on every bundle.
// Point it straight at the file instead (React Native has no Node crypto, so the web version is right).
const nobleCrypto = path.join(__dirname, 'node_modules', '@noble', 'hashes', 'esm', 'crypto.js');
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto' || moduleName === '@noble/hashes/crypto.js') {
    return { type: 'sourceFile', filePath: nobleCrypto };
  }
  return (resolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
