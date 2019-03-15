const Bundler = require("./parcelCustom");
const fs = require("fs");
const path = require("path");
const debug = require("debug")("react");
const mkdirp = require("mkdirp");
const crypto = require("crypto");
const ISDEV = process.env.NODE_ENV !== "production";
function sha1(data) {
  return crypto
    .createHash("sha1")
    .update(data, "binary")
    .digest("hex");
}

module.exports = async (
  filename,
  bundlePath,
  basePath,
  publicBundlePath,
  targetNode
) => {
  mkdirp.sync(bundlePath);

  if (!targetNode) {
    // browser bundle needs and entry code
    var entryFileName = path.join(
      path.dirname(filename),
      "/entry." + sha1(filename) + ".js"
    );
    const entry = createEntry(path.basename(filename));
    // save entry code in a file and feed it to parcel
    fs.writeFileSync(entryFileName, entry, "utf8");
  }

  // Bundler options
  const bundler = new Bundler(targetNode ? filename : entryFileName, {
    outDir: bundlePath,
    outFile: targetNode ? "bundle.node.js" : "bundle.js",
    publicUrl: publicBundlePath,
    watch: !process.env.ISBUILDER,
    hmr: ISDEV && !process.env.ISBUILDER && !targetNode,
    logLevel: 2,
    target: targetNode ? "node" : "browser",
    cacheDir: path.join(
      process.env.BUILDPATH,
      "_cache",
      sha1(filename),
      targetNode ? "node" : "browser"
    ),
    cache: !process.env.ISBUILDER,
    minify: !ISDEV,
    autoinstall: false,
    sourceMaps: false //!ISDEV
  });
  //console.log("rootDir", bundler.options.rootDir)

  const bundle = await bundler.bundle();

  //https://github.com/parcel-bundler/parcel/issues/1401
  if (targetNode) {
    const bundleNodeFile = path.join(bundlePath, "bundle.node.js");
    if (fs.existsSync(bundleNodeFile)) {
      var bundleContent = fs.readFileSync(bundleNodeFile, "utf8");
      bundleContent = `;var parcelRequire;\n` + bundleContent;
      fs.writeFileSync(bundleNodeFile, bundleContent, "utf8");
    } else {
      debug("bundle for node doesn't exists.", bundleNodeFile);
    }
  }

  return bundle;
};

const createEntry = componentPath => {
  return `
var React = require("react")
// require("@babel/polyfill");

// we add React to global scope to allow react pages without require('react') in them.
window.React = React
var App = require('./${componentPath}')
App = (App && App.default)?App.default : App;
const { hydrate } = require('react-dom')


const props = JSON.parse(
  initial_props.innerHTML
)
const el = React.createElement(App, props)
hydrate(el, document.getElementById("_react_root"))
`;
};
