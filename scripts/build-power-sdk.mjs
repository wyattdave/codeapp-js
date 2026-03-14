import path from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { build } from 'esbuild';

const sWorkspaceRoot = process.cwd();
const sSdkEntry = path.join(
  sWorkspaceRoot,
  'node_modules',
  '@microsoft',
  'power-apps',
  'lib',
  'data',
  'index.js'
);

async function findSdkTargets(sDirPath) {
  const aEntries = await readdir(sDirPath, { withFileTypes: true });
  let aTargets = [];

  for (const oEntry of aEntries) {
    if (oEntry.name === 'node_modules' || oEntry.name === '.git') {
      continue;
    }

    const sEntryPath = path.join(sDirPath, oEntry.name);

    if (oEntry.isDirectory()) {
      const aChildTargets = await findSdkTargets(sEntryPath);
      aTargets = aTargets.concat(aChildTargets);
      continue;
    }

    if (oEntry.isFile() && oEntry.name === 'power-apps-data.js') {
      aTargets.push(sEntryPath);
    }
  }

  return aTargets;
}

async function bundleSdk() {
  await access(sSdkEntry);

  const aTargets = await findSdkTargets(sWorkspaceRoot);

  if (aTargets.length === 0) {
    throw new Error('No power-apps-data.js targets were found in the workspace.');
  }

  for (const sTargetPath of aTargets) {
    await build({
      entryPoints: [sSdkEntry],
      outfile: sTargetPath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      legalComments: 'none',
      logLevel: 'silent'
    });

    console.log('Bundled SDK to ' + path.relative(sWorkspaceRoot, sTargetPath));
  }
}

bundleSdk().catch((oError) => {
  console.error(oError.message);
  process.exitCode = 1;
});