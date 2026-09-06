import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import archiver from 'node:zlib';

// Since we have python3, we can use python's zipfile or node's built-in tools
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const zipFile = path.resolve(rootDir, 'Grow-Prune-Web.zip');

console.log('Building project...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

console.log(`Packaging ${distDir} into ${zipFile}...`);
// Use python3's zipfile to package dist contents to root of zip
const pythonCmd = `python3 -c "import zipfile, os
zf = zipfile.ZipFile(r'${zipFile}', 'w', zipfile.ZIP_DEFLATED)
for root, dirs, files in os.walk(r'${distDir}'):
    for f in files:
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, r'${distDir}')
        zf.write(full_path, rel_path)
zf.close()
print('Successfully created', r'${zipFile}')"`;

execSync(pythonCmd, { cwd: rootDir, stdio: 'inherit' });
