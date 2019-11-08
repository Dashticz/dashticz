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
                loaders: ["style-loader", "css-loader"]
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
                loader: 'url-loader?limit=100000'
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('jquery'),
                use: [{
                    loader: 'expose-loader',
                    options: 'jQuery'
                }, {
                    loader: 'expose-loader',
                    options: '$'
                }]
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('mobile-detect'),
                use: {
                    loader: 'expose-loader',
                    options: 'MobileDetect'
                }
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('js-cookie'),
                use: {
                    loader: 'expose-loader',
                    options: 'Cookies'
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