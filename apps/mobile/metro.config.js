const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);
config.watchFolders = [require('path').resolve(__dirname, '../../packages')];

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
});
