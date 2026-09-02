var path = require('path');
var TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var rootDir = path.resolve(__dirname, '..');

module.exports = {
  plugins: [new MiniCssExtractPlugin()],
  entry: {
    bundle: path.resolve(rootDir, 'src/index.js'),
  },
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[contenthash:8].js',
    path: path.resolve(rootDir, 'dist'),
    clean: {
      // Keep legacy font formats that may still be referenced by custom CSS.
      keep: /^assets\/fonts\//,
    },
  },
  module: {
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        test: /\.js$/, // Check for all js files
        use: [
          {
            loader: 'babel-loader',
            options: {
              configFile: path.resolve(__dirname, 'babel.config.js'),
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
          },
        ],
      },
      {
        test: /\.(scss)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader', // translates CSS into CommonJS modules
          },
          {
            loader: 'sass-loader', // compiles Sass to CSS
            options: {
              // Bootstrap still emits deprecations from its own Sass sources.
              // Keep warnings from Dashticz sources visible while dependencies
              // work through their upstream migration.
              sassOptions: {
                quietDeps: true,
              },
            },
          },
        ],
      },
      {
        test: /\.(jpe?g|png|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js'],
    fallback: {
      fs: false,
    },
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: false,
          keep_fnames: false,
        },
      }),
    ],
    splitChunks: {
      chunks: 'async',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          reuseExistingChunk: true,
        },
      },
    },
  },
  // Webpack's generic 244 KiB defaults are not realistic for this legacy
  // single-page dashboard. These budgets reflect the optimized 3.45 entry
  // point with a small growth allowance and turn a regression into a failed
  // build. Font fallbacks are auxiliary assets and are not downloaded as
  // part of the entry point, so the budget covers executable JS and CSS.
  performance: {
    hints: 'error',
    maxAssetSize: 1225 * 1024,
    maxEntrypointSize: 1600 * 1024,
    assetFilter: function (assetFilename) {
      return /\.(?:css|js)$/.test(assetFilename);
    },
  },
};
