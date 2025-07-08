const presets = [
  [
    "@babel/env",
    {
      targets: "> 1%, last 2 versions, not dead",
      // No polyfills at all - smallest size
    },
  ],
];

module.exports = { presets };