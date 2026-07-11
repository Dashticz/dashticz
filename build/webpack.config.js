var path = require('path');
var TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
var rootDir = path.resolve(__dirname, '..');

module.exports = {
    plugins: [new MiniCssExtractPlugin()],
    entry: {
        bundle: path.resolve(rootDir, 'src/index.js'),
    },
    output: {
        filename: '[name].js',
        path: path.resolve(rootDir, 'dist'),
      },
    module: {
        rules: [
            {
                resourceQuery: /raw/,
                type: 'asset/source'
              },
            {
                test: /\.js$/, // Check for all js files
                use: [{
                    loader: 'babel-loader',
                    options: {
                        configFile: path.resolve(__dirname, 'babel.config.js')
                    }
                }]
            },
            {
                test: /\.css$/,
                use: [ {
                    loader: "style-loader"
                },{
                    loader: "css-loader"
                }]
            },
            {
                test: /\.(scss)$/,
                use: [ {
                    loader: MiniCssExtractPlugin.loader,
                },{
                  loader: 'css-loader', // translates CSS into CommonJS modules
                },  {
                  loader: 'sass-loader' // compiles Sass to CSS
                }]
            },
            {
                test: /\.(jpe?g|png|gif)$/i,
                type: 'javascript/auto',
                loader: "file-loader",
                options: {
                    name: '[name].[ext]',
                    outputPath: 'assets/images/'
                    //the images will be emited to dist/assets/images/ folder
                }
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)$/,
            type: 'javascript/auto',
            loader: 'file-loader',
            options: {
                name: '[name].[ext]',
                outputPath: './assets/fonts/'
            }
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
                    keep_classnames: true,
                    keep_fnames: true
                }
              })
            ]
      },
};
