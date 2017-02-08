'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var rollupPluginutils = require('rollup-pluginutils');
var postcss = _interopDefault(require('postcss'));
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var convert = _interopDefault(require('convert-source-map'));

var _logSuccess = function(msg, title) {
  var date = new Date;
  var time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
  console.log('[' + time + ']', title || 'POSTCSS', "'" + '\x1b[32m' + msg + '\x1b[0m' + "'");
};

var noOp = function() {};

var styles = {};
var changes = 0;

function _postcss(styles, plugins, output, onDone) {
  _logSuccess('init');
  var r = "";
  var index = 0;
  var n = Object.keys(styles).length;
  for (var file in styles) {
    postcss(plugins)
      .process(styles[file] || '', {
        from: file,
        to: file,
	map: { inline: false}
      })
      .then(function(result) {
        index += 1;
        r += result.css;
        var sourcemap = convert.fromJSON(result.map).toBase64();
        if (index === n) {
          fs.writeFile(output + '.map', sourcemap, function(err) {
            if (err) {
              return console.log(err);
            } else {
              fs.stat(output, function(err, stat) {
                  _logSuccess(getSize(stat.size),'POSTCSS BUNDLE SIZE');
                  onDone();
              });
            }
          });
          fs.writeFile(output + '.map', s, function(err) {
            if (err) {
              return console.log(err);
            } else {
            }
          });
        }
      });
  }
}

function getSize (bytes) {
  return bytes < 10000
    ? bytes.toFixed(0) + ' B'
    : bytes < 1024000
    ? (bytes / 1024).toPrecision(3) + ' kB'
    : (bytes / 1024 / 1024).toPrecision(4) + ' MB'
}

var index = function(options, done) {
  if ( options === void 0 ) options = {};

  if (typeof(done) != 'function') { done = noOp; }
  var filter = rollupPluginutils.createFilter(options.include, options.exclude);
  var plugins = options.plugins || [];
  var extensions = options.extensions || ['.css', '.sss'];
  var output = options.output || './style.css';
  var parse = true;
  if (options.parse != null) {
    parse = options.parse;
  }

  return {
    ongenerate: function ongenerate() {
      // No stylesheet needed
      if (!changes || parse === false) {
        done();
        return
      }
      changes = 0;
      _postcss(styles, plugins, output, done);
    },
    transform: function transform(code, id) {
      if (!filter(id)) {
        return
      }
      if (parse) {
        if (extensions.indexOf(path.extname(id)) === -1) {
          return null;
        }
        // Keep track of every stylesheet
        // Check if it changed since last render
        if (styles[id] !== code && code != '') {
          styles[id] = code;
          changes++;
        }
        return 'export default null'
      } else {
        if (extensions.indexOf(path.extname(id)) > -1) {
          return 'export default null'
        }
      }
    }
  }
};

module.exports = index;
