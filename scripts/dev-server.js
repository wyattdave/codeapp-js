'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const oMimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function parseArgs(aArgs) {
  const oOptions = {
    openPath: '',
    port: 4173,
    root: '.'
  };

  for (let iIndex = 0; iIndex < aArgs.length; iIndex += 1) {
    const sArg = aArgs[iIndex];
    const sNextArg = aArgs[iIndex + 1];

    if (sArg === '--root' && sNextArg) {
      oOptions.root = sNextArg;
      iIndex += 1;
      continue;
    }

    if (sArg === '--port' && sNextArg) {
      const iPort = Number.parseInt(sNextArg, 10);

      if (!Number.isNaN(iPort) && iPort > 0) {
        oOptions.port = iPort;
      }

      iIndex += 1;
      continue;
    }

    if (sArg === '--open' && sNextArg) {
      oOptions.openPath = sNextArg;
      iIndex += 1;
      continue;
    }

    if (sArg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return oOptions;
}

function printHelp() {
  console.log('Usage: node scripts/dev-server.js --root <path> --port <number> [--open <path>]');
}

function getSafePath(sRootPath, sUrlPath) {
  const sDecodedPath = decodeURIComponent(sUrlPath.split('?')[0]);
  const sNormalizedPath = path.normalize(sDecodedPath).replace(/^([\\/])+/, '');
  const sRequestedPath = path.resolve(sRootPath, '.' + path.sep + sNormalizedPath);
  const sResolvedRootPath = path.resolve(sRootPath);

  if (sRequestedPath !== sResolvedRootPath && !sRequestedPath.startsWith(sResolvedRootPath + path.sep)) {
    return '';
  }

  return sRequestedPath;
}

function getFilePath(sRootPath, sUrlPath) {
  const sPathName = sUrlPath === '/' ? '/index.html' : sUrlPath;
  const sRequestedPath = getSafePath(sRootPath, sPathName);

  if (!sRequestedPath) {
    return '';
  }

  if (fs.existsSync(sRequestedPath) && fs.statSync(sRequestedPath).isDirectory()) {
    const sIndexPath = path.join(sRequestedPath, 'index.html');
    return fs.existsSync(sIndexPath) ? sIndexPath : '';
  }

  return sRequestedPath;
}

function sendResponse(oResponse, iStatusCode, sContentType, vBody) {
  oResponse.writeHead(iStatusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': sContentType
  });
  oResponse.end(vBody);
}

function getContentType(sFilePath) {
  const sExtension = path.extname(sFilePath).toLowerCase();
  return oMimeTypes[sExtension] || 'application/octet-stream';
}

function openBrowser(sUrl) {
  const sPlatform = process.platform;
  let sCommand = '';
  let aCommandArgs = [];

  if (sPlatform === 'win32') {
    sCommand = 'cmd';
    aCommandArgs = ['/c', 'start', '', sUrl];
  } else if (sPlatform === 'darwin') {
    sCommand = 'open';
    aCommandArgs = [sUrl];
  } else {
    sCommand = 'xdg-open';
    aCommandArgs = [sUrl];
  }

  const oChild = spawn(sCommand, aCommandArgs, {
    detached: true,
    stdio: 'ignore'
  });

  oChild.unref();
}

function createRequestHandler(sRootPath) {
  return (oRequest, oResponse) => {
    const sMethod = oRequest.method || 'GET';

    if (sMethod !== 'GET' && sMethod !== 'HEAD') {
      sendResponse(oResponse, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
      return;
    }

    const sRequestUrl = oRequest.url || '/';
    const sFilePath = getFilePath(sRootPath, sRequestUrl);

    if (!sFilePath) {
      sendResponse(oResponse, 404, 'text/plain; charset=utf-8', 'Not Found');
      return;
    }

    if (!fs.existsSync(sFilePath) || !fs.statSync(sFilePath).isFile()) {
      sendResponse(oResponse, 404, 'text/plain; charset=utf-8', 'Not Found');
      return;
    }

    const sContentType = getContentType(sFilePath);

    oResponse.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': sContentType
    });

    if (sMethod === 'HEAD') {
      oResponse.end();
      return;
    }

    const oStream = fs.createReadStream(sFilePath);
    oStream.on('error', () => {
      sendResponse(oResponse, 500, 'text/plain; charset=utf-8', 'Internal Server Error');
    });
    oStream.pipe(oResponse);
  };
}

function startServer() {
  const oOptions = parseArgs(process.argv.slice(2));
  const sRootPath = path.resolve(process.cwd(), oOptions.root);
  const oServer = http.createServer(createRequestHandler(sRootPath));

  oServer.listen(oOptions.port, () => {
    const sUrl = 'http://127.0.0.1:' + oOptions.port;

    console.log('Serving ' + sRootPath + ' at ' + sUrl);

    if (oOptions.openPath) {
      const sOpenUrl = sUrl + (oOptions.openPath.startsWith('/') ? oOptions.openPath : '/' + oOptions.openPath);
      openBrowser(sOpenUrl);
    }
  });
}

startServer();