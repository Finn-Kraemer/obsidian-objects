import { readFileSync, writeFileSync } from 'fs';

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;

manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));

// update versions.json
let versions = {};
try {
	versions = JSON.parse(readFileSync('versions.json', 'utf8'));
} catch (e) {
	// versions.json might not exist yet
}
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));
