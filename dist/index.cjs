'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const url = require('url');

function _interopNamespaceCompat(e) {
    if (e && typeof e === 'object' && 'default' in e) return e;
    const n = Object.create(null);
    if (e) {
        for (const k in e) {
            n[k] = e[k];
        }
    }
    n.default = e;
    return n;
}

const fs__namespace = /*#__PURE__*/_interopNamespaceCompat(fs);
const path__namespace = /*#__PURE__*/_interopNamespaceCompat(path);

const ESFilename = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (document.currentScript && document.currentScript.src || new URL('index.cjs', document.baseURI).href)));
const ESDirname = path__namespace.dirname(ESFilename);
const pngquant = path__namespace.join(ESDirname, "exe", "pngquant.exe");
const b64Reg = /^export default (\"data:image\/png;base64,[A-Za-z0-9+/=]*\")$/;
async function compress(imgBuffer, imgPath) {
  let buffer = imgBuffer;
  try {
    const res = await execa.execa(pngquant, ["-"], {
      encoding: null,
      maxBuffer: Infinity,
      input: imgBuffer
    });
    buffer = res.stdout;
  } catch {
    throw `image compress error: ${imgPath}`;
  } finally {
    return buffer;
  }
}
function pngmin() {
  let outDir, publicDir;
  return {
    name: "vite:pngmin",
    apply: "build",
    configResolved(config) {
      if (typeof config.publicDir === "string") {
        publicDir = config.publicDir;
      }
      outDir = config.build.outDir;
    },
    async transform(code, id) {
      const extname = path__namespace.extname(id);
      if (extname === ".png" && b64Reg.test(code)) {
        const imgBuffer = fs__namespace.readFileSync(id);
        const source = await compress(imgBuffer, id);
        return `export default "data:image/png;base64,${source.toString(
          "base64"
        )}"`;
      }
    },
    async generateBundle(_, bundle) {
      const imgPaths = [];
      Object.keys(bundle).forEach((key) => {
        const extname = path__namespace.extname(key);
        if (extname === ".png") {
          imgPaths.push(key);
        }
      });
      const handles = imgPaths.map(async (imgPath) => {
        const source = await compress(bundle[imgPath].source, imgPath);
        bundle[imgPath].source = source;
      });
      await Promise.all(handles);
    },
    async closeBundle() {
      if (typeof publicDir !== "string")
        return;
      const getImgPath = (imgPath) => {
        const res = [];
        if (fs__namespace.existsSync(imgPath)) {
          const stat = fs__namespace.lstatSync(imgPath);
          if (stat.isDirectory()) {
            const files = fs__namespace.readdirSync(imgPath);
            files.forEach((file) => {
              const temp = getImgPath(path__namespace.join(imgPath, file));
              res.push(...temp);
            });
          } else if (path__namespace.extname(imgPath) === ".png")
            res.push(imgPath);
        }
        return res;
      };
      const imgPaths = getImgPath(publicDir);
      const handles = imgPaths.map(async (imgPath) => {
        const imgBuffer = fs__namespace.readFileSync(imgPath);
        const source = await compress(imgBuffer, imgPath);
        let targetPath = imgPath.replace(publicDir + path__namespace.sep, "");
        targetPath = path__namespace.join(outDir, targetPath);
        fs__namespace.writeFileSync(targetPath, source);
      });
      await Promise.all(handles);
    }
  };
}

module.exports = pngmin;
