export const project = {
  title: "Picture Hanging Helper",
  tagline: "Centered frames. Clear marks. Fewer pencil guesses.",
  intro:
    "Plan a centered row or regular grid of equal-size frames. Enter the hook position measured from each frame\u2019s top-left corner. Verify your actual hardware before drilling.",
  fields: [
    ["name", "Layout name", "text", "Living room gallery"],
    ["unit", "Units", "unit", "cm"],
    ["wall", "Wall width", "number", 300],
    ["fw", "Frame width", "number", 40],
    ["fh", "Frame height", "number", 50],
    ["cols", "Columns", "integer", 3],
    ["rows", "Rows", "integer", 1],
    ["gapx", "Horizontal gap", "number", 10],
    ["gapy", "Vertical gap", "number", 10],
    ["top", "Top edge above floor", "number", 180],
    ["hookx", "Hook offset from frame left", "number", 20],
    ["hooky", "Hook offset below frame top", "number", 5],
  ],
  scope:
    "Centered equal-frame row and grid arrangements with exact frame edges and one hook coordinate per frame, diagrams and a printable measured guide.",
  slug: "picture-hanging-helper",
};

export function number(
  value,
  label,
  { zero = false, max = 1000000, integer = false } = {},
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < (zero ? 0 : 0.001) ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(
      `${label} must be ${integer ? "a whole number " : ""}between ${zero ? 0 : integer ? 1 : 0.001} and ${max}.`,
    );
  return value;
}
export function validate(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan))
    throw new Error("Each plan must be an object.");
  const expected = project.fields.map((f) => f[0]);
  if (
    Object.keys(plan).length !== expected.length ||
    Object.keys(plan).some((k) => !expected.includes(k))
  )
    throw new Error("Plan fields do not match this tool.");
  const out = {};
  for (const [key, label, type] of project.fields) {
    const value = plan[key];
    if (type === "text") {
      if (typeof value !== "string" || !value.trim() || value.length > 120)
        throw new Error(`${label} must contain 1–120 characters.`);
      out[key] = value.trim();
    } else if (type === "unit") {
      if (!["cm", "mm", "in"].includes(value))
        throw new Error("Choose cm, mm or inches.");
      out[key] = value;
    } else
      out[key] = number(value, label, {
        zero: [
          "gapx",
          "gapy",
          "hookx",
          "hooky",
          "overlap",
          "tolerance",
        ].includes(key),
        max: type === "integer" ? 10 : 1000000,
        integer: type === "integer",
      });
  }
  calculate(out);
  return out;
}
export function parseBackup(text) {
  if (typeof text !== "string" || text.length > 1000000)
    throw new Error("Backup exceeds the 1 MB text limit.");
  let b;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error("This is not valid JSON.");
  }
  if (
    !b ||
    b.tool !== project.slug ||
    b.version !== 1 ||
    !Array.isArray(b.plans) ||
    b.plans.length > 100 ||
    Object.keys(b).some((k) => !["tool", "version", "plans"].includes(k))
  )
    throw new Error(
      "Choose a version 1 backup from this tool with at most 100 plans.",
    );
  return b.plans.map(validate);
}
export function backup(plans) {
  return JSON.stringify(
    { tool: project.slug, version: 1, plans: plans.map(validate) },
    null,
    2,
  );
}
export function atLeast(a, b) {
  return a + Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b)) * 8 >= b;
}
export function round(value) {
  return Math.round(value * 1000) / 1000;
}

export function calculate(p) {
  if (p.hookx > p.fw || p.hooky > p.fh)
    throw new Error("Hook offsets must lie within the frame.");
  const width = p.cols * p.fw + (p.cols - 1) * p.gapx,
    height = p.rows * p.fh + (p.rows - 1) * p.gapy;
  if (!atLeast(p.wall, width))
    throw new Error(
      "This arrangement is wider than the wall. Reduce columns, frame width or gaps.",
    );
  if (!atLeast(p.top, height))
    throw new Error(
      "The bottom row would extend below the floor. Raise the top edge or reduce the arrangement.",
    );
  const left = (p.wall - width) / 2,
    frames = [];
  for (let row = 0; row < p.rows; row++)
    for (let col = 0; col < p.cols; col++) {
      const x = left + col * (p.fw + p.gapx),
        top = p.top - row * (p.fh + p.gapy);
      frames.push({
        label: `Row ${row + 1}, frame ${col + 1}`,
        x: round(x),
        top: round(top),
        hookx: round(x + p.hookx),
        hooky: round(top - p.hooky),
        bottom: round(top - p.fh),
      });
    }
  return {
    left: round(left),
    width: round(width),
    height: round(height),
    frames,
  };
}
