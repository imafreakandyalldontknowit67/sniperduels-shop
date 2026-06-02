// Visual diff between baseline and upgraded screenshots
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const BASELINE = './upgrade-snapshots/baseline';
const UPGRADED = './upgrade-snapshots/upgraded';
const DIFF = './upgrade-snapshots/diff';
fs.mkdirSync(DIFF, { recursive: true });

const baselineFiles = fs.readdirSync(BASELINE).filter(f => f.endsWith('.png'));
const results = [];

for (const file of baselineFiles) {
  const baselinePath = path.join(BASELINE, file);
  const upgradedPath = path.join(UPGRADED, file);
  if (!fs.existsSync(upgradedPath)) {
    results.push({ file, status: 'no_upgraded_match' });
    console.log(`SKIP ${file} - no upgraded counterpart`);
    continue;
  }

  const b = PNG.sync.read(fs.readFileSync(baselinePath));
  const u = PNG.sync.read(fs.readFileSync(upgradedPath));

  if (b.width !== u.width || b.height !== u.height) {
    // Use intersection - crop both to min dimensions
    const w = Math.min(b.width, u.width);
    const h = Math.min(b.height, u.height);
    // Create cropped versions
    const bCrop = new PNG({ width: w, height: h });
    const uCrop = new PNG({ width: w, height: h });
    PNG.bitblt(b, bCrop, 0, 0, w, h, 0, 0);
    PNG.bitblt(u, uCrop, 0, 0, w, h, 0, 0);
    const diff = new PNG({ width: w, height: h });
    const numDiff = pixelmatch(bCrop.data, uCrop.data, diff.data, w, h, { threshold: 0.1 });
    fs.writeFileSync(path.join(DIFF, file), PNG.sync.write(diff));
    const total = w * h;
    const pct = (numDiff / total) * 100;
    results.push({
      file,
      status: 'compared_cropped',
      baseline_dims: `${b.width}x${b.height}`,
      upgraded_dims: `${u.width}x${u.height}`,
      compared_dims: `${w}x${h}`,
      diff_pixels: numDiff,
      total_pixels: total,
      pct_different: pct.toFixed(2),
    });
    console.log(`${file} dims_differ b=${b.width}x${b.height} u=${u.width}x${u.height} cropped=${w}x${h} diff=${pct.toFixed(2)}%`);
    continue;
  }

  const { width, height } = b;
  const diff = new PNG({ width, height });
  const numDiff = pixelmatch(b.data, u.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(path.join(DIFF, file), PNG.sync.write(diff));
  const total = width * height;
  const pct = (numDiff / total) * 100;
  results.push({
    file,
    status: 'compared',
    dims: `${width}x${height}`,
    diff_pixels: numDiff,
    total_pixels: total,
    pct_different: pct.toFixed(2),
  });
  console.log(`${file} ${width}x${height} diff=${numDiff}/${total} (${pct.toFixed(2)}%)`);
}

fs.writeFileSync('./upgrade-snapshots/visual-diff-results.json', JSON.stringify(results, null, 2));
console.log('\n=== Visual Diff Summary ===');
results.forEach(r => {
  if (r.status.startsWith('compared')) {
    const flag = parseFloat(r.pct_different) > 5 ? ' >>> WARN >5%' : '';
    console.log(`  ${r.file}: ${r.pct_different}%${flag}`);
  } else {
    console.log(`  ${r.file}: ${r.status}`);
  }
});
