// Preload before HyperFrames/Puppeteer. Hide child consoles without changing
// visible Chrome Studio windows or patching installed dependencies.
const cp = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
if (process.platform === 'win32' && !cp.__roboWindowsHide) {
  const fs = require('node:fs');
  const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  if (!process.env.HYPERFRAMES_BROWSER_PATH && fs.existsSync(chrome)) process.env.HYPERFRAMES_BROWSER_PATH = chrome;
  const spawn = cp.spawn;
  const spawnSync = cp.spawnSync;
  const execFile = cp.execFile;
  const execFileSync = cp.execFileSync;
  cp.spawn = function(command, args, options) {
    if (Array.isArray(args)) return spawn.call(this, command, args, { ...options, windowsHide: true });
    return spawn.call(this, command, { ...args, windowsHide: true });
  };
  cp.spawnSync = function(command, args, options) {
    if (Array.isArray(args)) return spawnSync.call(this, command, args, { ...options, windowsHide: true });
    return spawnSync.call(this, command, { ...args, windowsHide: true });
  };
  cp.execFile = function(file, args, options, callback) {
    if (typeof args === 'function') return execFile.call(this,file,[],{windowsHide:true},args);
    if (!Array.isArray(args)) return execFile.call(this,file,[],{...args,windowsHide:true},options);
    if (typeof options === 'function') return execFile.call(this,file,args,{windowsHide:true},options);
    return execFile.call(this,file,args,{...options,windowsHide:true},callback);
  };
  cp.execFileSync = function(file,args,options) {
    if (Array.isArray(args)) return execFileSync.call(this,file,args,{...options,windowsHide:true});
    return execFileSync.call(this,file,{...args,windowsHide:true});
  };
  cp.__roboWindowsHide = true;
  syncBuiltinESMExports();
}
