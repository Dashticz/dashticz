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
    alias: {
      // jquery-ui-dist declares "jquery": ">=1.8.0 <4.0.0" (package.json),
      // so npm installs its own nested jquery@3.x under
      // node_modules/jquery-ui-dist/node_modules/jquery even though the
      // app itself uses jquery@4. jquery-ui.min.js's UMD wrapper never
      // requires "jquery" directly at runtime - it just references the
      // free `jQuery` global - but its `typeof define === "function" &&
      // define.amd ? define(["jquery"], factory) : factory(jQuery)` shape
      // is still webpack's classic UMD/AMD pattern: webpack's parser
      // statically resolves the `define(["jquery"], ...)` branch's
      // "jquery" dependency at build time regardless of which branch runs,
      // and Node/webpack module resolution finds the nearest node_modules
      // first - the nested 3.x copy - so jQuery UI ends up registering
      // .slider()/.draggable()/etc. onto a bundled jquery@3.x instance
      // nobody else ever sees, instead of the app's real jquery@4 (window.
      // jQuery), leaving every jQuery UI method silently missing at
      // runtime. Force every "jquery" resolution in the bundle - explicit
      // imports and this implicit AMD one alike - to the single top-level
      // install so there is exactly one jQuery instance.
      jquery: path.resolve(rootDir, 'node_modules/jquery'),
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
