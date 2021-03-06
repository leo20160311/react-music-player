const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    app: './src/main.js'
  },
  output: {
    filename: 'static/js/[name].[hash:8].js',
    chunkFilename: 'static/js/[name].[chunkhash:8].js',
    path: path.resolve(__dirname, '../dist')
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1024 * 3,
              name: 'static/images/[name].[hash:7].[ext]'
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"]
  },
  plugins: [
    // 向模板 index.html 中自动注入css和js
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
      inject: true
    })
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          name: 'vendors'
        },
        commons: {
          chunks: 'all',
          name: 'commons',
          priority: -11,
          minChunks: 2
        }
      }
    },
    runtimeChunk: 'single'
  }
}