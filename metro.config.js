const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude .local/skills temp directories from Metro watcher
// These cause ENOENT crashes when skill temp dirs are deleted during operation
config.watchFolders = config.watchFolders || [];
config.resolver = config.resolver || {};
config.resolver.blockList = [
  /\.local[/\\]skills[/\\]\..*/,
  /\.local[/\\].*\.tmp.*/,
  /\.local[/\\].*\.old.*/,
];

module.exports = config;
