const fs = require("fs");
const BASE = "C:/Users/VijayBandaru/";

function fixLine(fpath, lineNum, oldText, newText) {
  const content = fs.readFileSync(fpath, "utf8");
  const lines = content.split("\n");
  const idx = lineNum - 1;
  for (let i = Math.max(0, idx-5); i <= Math.min(lines.length-1, idx+5); i++) {
    if (lines[i].includes(oldText)) {
      lines[i] = lines[i].replace(oldText, newText);
      fs.writeFileSync(fpath, lines.join("\n"));
      return true;
    }
  }
  console.log("  WARN not found:", fpath.split("/").pop(), lineNum, JSON.stringify(oldText));
  return false;
}

function stripAssign(fpath, lineNum, _varName) {
  const content = fs.readFileSync(fpath, "utf8");
  const lines = content.split("\n");
  const idx = lineNum - 1;
  if (idx < lines.length) {
    const stripped = lines[idx].replace(/^(s*)(const|let|var)s+S+s*=s*/, "");
    if (stripped !== lines[idx]) { lines[idx] = stripped; fs.writeFileSync(fpath, lines.join("\n")); return true; }
  }
  console.log("  WARN strip:", fpath.split("/").pop(), lineNum);
  return false;
}

function _rc(fname, n, oldN, _newN) { return fixLine(BASE+fname, n, "catch ("+oldN+")", "catch (_"+oldN+")"); }
function _rv(fname, n, o, nv) { return fixLine(BASE+fname, n, o, nv); }
function _sa(fname, n, v) { return stripAssign(BASE+fname, n, v); }
