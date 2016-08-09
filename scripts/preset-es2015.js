module.exports = {
  presets: [
    [require('babel-preset-es2015').buildPreset, {
      modules: process.env.RUN_MODE === 'es' ? false : 'commonjs',
    }],
  ],
};
