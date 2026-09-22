import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const videoFolders = [
  'compositions', 'scripts', 'assets/images/generated', 'assets/images/references',
  'assets/models', 'assets/textures', 'assets/fonts', 'assets/vendor', 'assets/footage',
  'music/originals', 'music/edits', 'audio/voiceover', 'audio/sfx',
  'renders/previews', 'renders/final', 'renders/frames', 'renders/delivery', 'references',
];

export function prepareVideoFolders(directory) {
  const root = path.resolve(directory);
  for (const folder of videoFolders) fs.mkdirSync(path.join(root, folder), { recursive: true });
  const manifest = path.join(root, 'ASSETS.json');
  if (!fs.existsSync(manifest)) fs.writeFileSync(manifest, JSON.stringify({
    version: 1, project: path.basename(root), assets: [],
    fields: 'Each asset records id, relative path, kind, source or provider, prompt when generated, license or usage notes, and derivedFrom when edited.',
  }, null, 2) + '\n');
  return root;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2];
  if (!directory || directory === '--help') {
    console.log('Usage: node prepare-video-folders.mjs <video-project-directory>');
    process.exit(directory ? 0 : 1);
  }
  console.log(`Prepared reusable media folders: ${prepareVideoFolders(directory)}`);
}
