const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new Dotenv({
      path: './.env', // Path to .env file
      safe: false, // Don't require .env.example
      systemvars: true, // Load system environment variables as well
      silent: false, // Show errors if .env file is missing
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'public', 
          to: '',
          globOptions: {
            ignore: ['**/index.html'],
          },
        }
      ],
    }),
  ],
  devServer: {
    historyApiFallback: true,
    static: [
      {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
      }
    ],
    port: 3001,
    host: '0.0.0.0', // Allow external connections
    hot: true,
    open: true,
    allowedHosts: 'all', // Allow all hosts for mobile access
  },
};
