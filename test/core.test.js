import test from "node:test";
import assert from "node:assert/strict";
import {
  project,
  validate,
  calculate,
  parseBackup,
  backup,
  round,
} from "../src/core.js";
const sample = () =>
  Object.fromEntries(project.fields.map(([key, , , value]) => [key, value]));
test("example validates and backup roundtrips without losing values", () => {
  const p = sample();
  assert.deepEqual(parseBackup(backup([p])), [p]);
  assert.deepEqual(validate(p), p);
});
test("reject wrong tool/version, extra fields and non-objects", () => {
  for (const bad of [
    "null",
    "[]",
    "{}",
    JSON.stringify({ tool: "wrong", version: 1, plans: [] }),
    JSON.stringify({ tool: project.slug, version: 2, plans: [] }),
    JSON.stringify({ tool: project.slug, version: 1, plans: [], extra: true }),
  ])
    assert.throws(() => parseBackup(bad));
  for (const bad of [
    null,
    [],
    { ...sample(), extra: 1 },
    { ...sample(), unit: "ft" },
    { ...sample(), name: "  " },
    { ...sample(), name: "x".repeat(121) },
  ])
    assert.throws(() => validate(bad));
});
test("reject malformed, oversized and too many plan backups", () => {
  assert.throws(() => parseBackup("{broken"));
  assert.throws(() => parseBackup("x".repeat(1000001)));
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        tool: project.slug,
        version: 1,
        plans: Array.from({ length: 101 }, sample),
      }),
    ),
  );
});
test("strict numeric types prevent null, string, boolean and nonfinite measurements", () => {
  const key = project.fields.find((f) => f[2] === "number")[0];
  for (const value of [null, true, "5", NaN, Infinity, -1, 0, 0.00001, 1000001])
    assert.throws(() => validate({ ...sample(), [key]: value }));
});
test("escaped-looking user labels remain plain data through backup", () => {
  const p = { ...sample(), name: "<img src=x onerror=alert(1)>" };
  assert.equal(parseBackup(backup([p]))[0].name, p.name);
});

test("centered row uses wall-left x and floor-based hook height", () => {
  const r = calculate(validate(sample()));
  assert.equal(r.width, 140);
  assert.equal(r.left, 80);
  assert.deepEqual(r.frames[0], {
    label: "Row 1, frame 1",
    x: 80,
    top: 180,
    hookx: 100,
    hooky: 175,
    bottom: 130,
  });
  assert.equal(r.frames[2].hookx, 200);
});
test("second row advances down and exact wall/floor boundary is accepted", () => {
  const r = calculate(
    validate({
      ...sample(),
      wall: 90,
      fw: 40,
      fh: 50,
      cols: 2,
      rows: 2,
      gapx: 10,
      gapy: 10,
      top: 110,
    }),
  );
  assert.equal(r.left, 0);
  assert.equal(r.frames[2].top, 50);
  assert.equal(r.frames[2].bottom, 0);
});
test("refuses frame outside wall, below floor, invalid offsets and noninteger layout", () => {
  for (const p of [
    { ...sample(), wall: 10 },
    { ...sample(), top: 49 },
    { ...sample(), hookx: 41 },
    { ...sample(), hooky: 51 },
    { ...sample(), rows: 1.5 },
    { ...sample(), cols: 11 },
    { ...sample(), rows: 0 },
  ])
    assert.throws(() => validate(p));
});
