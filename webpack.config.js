var path = require('path');
var TerserPlugin = require('terser-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    module: {
        rules: [
            {
                test: /\.js$/, // Check for all js files
                exclude: /node_modules\/(?!(dom7|swiper)\/).*/,
                use: ['babel-loader']
            },
            {
                test: /\.css$/,
                use:  [{
                    loader: "style-loader"
                },
                { loader:  "css-loader"}]
            },
            {
                test: /\.(jpe?g|png|gif)$/i,
                loader: "file-loader",
                options: {
                    name: '[name].[ext]',
                    outputPath: 'assets/images/'
                    //the images will be emited to dist/assets/images/ folder
                }
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)$/,
//                loader: 'url-loader?limit=100000'
            loader: 'file-loader',
            options: {
                name: '[name].[ext]',
                outputPath: './assets/fonts/'
            }
        },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('jquery'),
                loader: 'expose-loader',
                options: {
                    exposes: ['jQuery','$']
                }
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('mobile-detect'),
                loader: 'expose-loader',
                options: {
                    exposes: 'MobileDetect'
                }
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('js-cookie'),
                loader: 'expose-loader',
                options: {
                    exposes: 'Cookies'
                }
            }
        ],
        
    },
    resolve: {
        extensions: ['*', '.js']
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: 'dist/',
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