import {
  createFilter
} from 'rollup-pluginutils';
import postcss from 'postcss';
import path from 'path';
import fs from 'fs';
import combine from 'combine-source-map';
import convert from 'convert-source-map';
import sourceMap from 'source-map';

let _logSuccess = function(msg, title) {
  var date = new Date;
  var time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
  console.log('[' + time + ']', title || 'POSTCSS', "'" + '\x1b[32m' + msg + '\x1b[0m' + "'");
};

let noOp = function() {};

const styles = {};
let changes = 0;

function _postcss(styles, plugins, output, onDone) {
  _logSuccess('init');
  let r = "";

  let index = 0;
  let n = Object.keys(styles).length;
  let filename = output.substring(output.lastIndexOf('/') + 1, output.length);
  
  let combinedSourceMap = combine.create(filename);
  
  for (var file in styles) {
    postcss(plugins)
      .process(styles[file] || '', {
        from: file,
        to: file,
	map: { 
            inline: false, 
            annotation: false
        }
      })
      .then(function(result) {
        
        
        try {                
            index += 1;        
            r += result.css;    

            let sourceContent = '';
            for (let content in result.map['_sourcesContents']) {
                let fileContent = result.map['_sourcesContents'][content]
                sourceContent += fileContent;
                sourceContent += '\n/' + '/# sourceMappingURL=data:application/json;base64,';
                sourceContent += convert.fromJSON(result.map.toString()).toBase64();
            }
            
            let sourceFileName = result.map['_file'];
            combinedSourceMap.addFile({
                sourceFile: sourceFileName, 
                source: sourceContent
            });
            
            if (index === n) {
                let sourceMapBase64 = combinedSourceMap.base64();
                let sourceMapStr = convert.fromBase64(sourceMapBase64).toJSON();

                fs.writeFile(output + '.map', sourceMapStr, function(err) {
                    if (err) {
                    return console.log(err);
                    }
                });

        
                r += '\n/*# sourceMappingURL='+ filename +'.map */' ;
                fs.writeFile(output, r, function(err) {
                    if (err) {
                    return console.log(err);
                    } else {
                    fs.stat(output, function(err, stat) {
                        _logSuccess(getSize(stat.size),'POSTCSS BUNDLE SIZE');
                        onDone();
                    });
                    }
                });  
            }                

        } catch (err) {
            console.log(err);
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

export default function(options = {}, done) {
  if (typeof(done) != 'function') done = noOp;
  const filter = createFilter(options.include, options.exclude);
  const plugins = options.plugins || [];
  const extensions = options.extensions || ['.css', '.sss']
  const output = options.output || './style.css';
  let parse = true;
  if (options.parse != null) {
    parse = options.parse
  }

  return {
    ongenerate() {
      // No stylesheet needed
      if (!changes || parse === false) {
        done();
        return
      }
      changes = 0
      _postcss(styles, plugins, output, done)
    },
    transform(code, id) {
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
          styles[id] = code
          changes++
        }
        return 'export default null'
      } else {
        if (extensions.indexOf(path.extname(id)) > -1) {
          return 'export default null'
        }
      }
    }
  }
}
