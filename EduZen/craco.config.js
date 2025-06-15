const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          "stream": require.resolve("stream-browserify"),
          "crypto": require.resolve("crypto-browserify"),
          "util": require.resolve("util/"),
          "url": require.resolve("url/"),
          "http": require.resolve("stream-http"),
          "http2": false,
          "https": require.resolve("https-browserify"),
          "os": require.resolve("os-browserify/browser"),
          "path": require.resolve("path-browserify"),
          "zlib": require.resolve("browserify-zlib"),
          "querystring": require.resolve("querystring-es3"),
          "fs": false,
          "net": false,
          "tls": false,
          "child_process": false,
          "dns": false,
          "assert": false
        }
      },
      plugins: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer']
        })
      ]
    }
  }
};
