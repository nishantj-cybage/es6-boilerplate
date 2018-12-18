const fs = require('fs-extra');
const path = require('path');
const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
var apps = process.env.APPS ? process.env.APPS : ['homepage'];
var COPY_ARRAY = [];

const config = {
  entry: {},
  devtool: 'source-map', //'source-map',
  stats: 'errors-only',
};

COPY_ARRAY.push({
  from: path.resolve('./src/common/fonts/'),
  to: path.resolve('./dist/common/fonts/'),
});

config.entry['vendor'] = ['jquery', 'js-cookie'];
config.entry['polyfill'] = ['custom-event-polyfill', 'babel-polyfill'];

for (var i in apps) {
  // Add an entry point for each module we want to build
  config.entry[apps[i] + '/js/' + apps[i]] = [
    './src/' + apps[i] + '/js/' + apps[i] + '.js',
  ];

  COPY_ARRAY.push({
    from: path.resolve('./src/' + apps[i] + '/data/'),
    to: path.resolve('./dist/' + apps[i] + '/data/'),
  });

  COPY_ARRAY.push({
    from: path.resolve('./src/' + apps[i] + '/index.html'),
    to: path.resolve('./dist/' + apps[i] + '/index.html'),
  });
}

config.output = {
  path: path.resolve('./dist/'),
  filename: '[name].min.js',
  chunkFilename: '[name].min.js',
};

config.optimization = {
  splitChunks: {
    cacheGroups: {
      default: false,
      vendors: false,
      vendor: {
        chunks: 'all',
        name: 'vendor',
        test: 'vendor',
        enforce: true,
      },
    },
  },
};

config.module = {
  rules: [
    {
      test: require.resolve('jquery'),
      use: [
        {
          loader: 'expose-loader',
          options: 'jQuery',
        },
        {
          loader: 'expose-loader',
          options: '$',
        },
      ],
    },
    {
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
    },
    {
      test: /\.(css|scss)$/,
      use: [
        {
          loader: ExtractCssChunks.loader,
        },
        {
          loader: 'css-loader',
        },
        {
          loader: 'postcss-loader',
        },
        {
          loader: 'sass-loader',
          options: {
            includePaths: [
              path.resolve('./node_modules/'),
              path.resolve('./common/scss'),
            ],
          },
        },
      ],
    },
    {
      test: /\.hbs$/,
      loader: 'handlebars-loader',
      options: {
        precompileOptions: {
          knownHelpersOnly: false,
        },
      },
    },
    {
      test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader:
        'url-loader?limit=10000&mimetype=application/font-woff&name=fonts/[name].[ext]',
    },
    {
      test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'file?name=fonts/[name].[ext]',
    },
    {
      test: /\.(gif|png|jpe?g|svg)$/i,
      use: [
        {
          loader: 'url-loader',
          options: {
            limit: 8192,
            name: '[path][name].[ext]?[hash:7]',
          },
        },
        {
          loader: 'image-webpack-loader',
          options: {
            bypassOnDebug: true,
            mozjpeg: {
              progressive: true,
              quality: 75,
            },
          },
        },
      ],
    },
  ],
};

config.plugins = [
  new CleanWebpackPlugin(['dist/']),
  // new webpack.ProvidePlugin({
  //   $: 'jquery',
  //   jQuery: 'jquery',
  //   'window.jQuery': 'jquery'
  // }),
  new CopyWebpackPlugin([
    {
      from: path.resolve('./src/components/images/'),
      to: path.resolve('./dist/components/images/'),
      flatten: false,
    },
  ]),
  new ExtractCssChunks({
    filename: '[name].min.css',
    hot: true,
  }),
  function() {
    // generate build-hash.txt containing the hash of this build
    this.plugin('done', function() {
      // Generate bundle for Deployment
      if (!fs.existsSync(path.join('./dist/css/'))) {
        fs.ensureDirSync(path.join('./dist/css/'));
      }

      if (!fs.existsSync(path.join('./dist/js/'))) {
        fs.ensureDirSync(path.join('./dist/js/'));
      }

      if (!fs.existsSync(path.join('./dist/html/'))) {
        fs.ensureDirSync(path.join('./dist/html/'));
      }

      for (var i in apps) {
        var distPath = path.join('./dist/' + apps[i]);
        // var jsDistPath = path.join(distPath, '/js/');
        var cssDistPath = path.join(distPath, '/css/');
        var mainJsPath = apps[i] + '.min.js';
        var mainCssPath = apps[i] + '.min.css';
        var cssPathToMoveFrom = path.join('js', apps[i]) + '.min.css';

        if (!fs.existsSync(cssDistPath)) {
          fs.ensureDirSync(cssDistPath);
        }

        fs.copy(
          path.join(distPath, cssPathToMoveFrom),
          path.join(cssDistPath, mainCssPath),
          { overwrite: true }
        );

        fs.move(
          path.join(distPath, cssPathToMoveFrom + '.map'),
          path.join(cssDistPath, mainCssPath + '.map'),
          { overwrite: true }
        );

        fs.copy(
          path.join(distPath, cssPathToMoveFrom),
          path.join(path.join('./dist/css/'), mainCssPath),
          { overwrite: true }
        );

        fs.copy(
          path.join(distPath, path.join('js', mainJsPath)),
          path.join(path.join('./dist/js/'), mainJsPath),
          { overwrite: true }
        );

        fs.copy(
          path.join(distPath, 'index.html'),
          path.join(path.join('./dist/html/'), apps[i] + '.html'),
          { overwrite: true }
        );
      }

      //copying vendor.min.js and polyfill.min.js in js folder
      fs.copy(
        path.join('./dist/polyfill.min.js'),
        path.join('./dist/js/polyfill.min.js'),
        { overwrite: true }
      );

      fs.copy(
        path.join('./dist/vendor.min.js'),
        path.join('./dist/js/vendor.min.js'),
        { overwrite: true }
      );

      setTimeout(() => {
        for (var i in apps) {
          fs.remove(path.join('./dist', apps[i], '/js', apps[i]) + '.min.css');
        }
      }, 1000);
    });
  },
];

config.devServer = {
  contentBase: path.join(__dirname, 'dist'),
  compress: true,
  port: 3000,
  open: true,
  openPage: 'homepage/',
};

config.plugins.push(new CopyWebpackPlugin(COPY_ARRAY));

module.exports = config;
