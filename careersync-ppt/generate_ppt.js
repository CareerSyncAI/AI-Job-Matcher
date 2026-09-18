const fs = require("fs");
const path = require("path");
const https = require("https");
const pptxgen = require("pptxgenjs");

// List of icons to download
const iconsMap = {
  check: "check",
  eye: "eye",
  users: "users",
  shield: "shield",
  layers: "layers",
  clock: "clock",
  target: "target",
  briefcase: "briefcase",
  user: "user",
  settings: "settings",
  lock: "lock",
  cpu: "cpu",
  database: "database",
  file: "file",
  search: "search",
  branch: "git-branch",
  activity: "activity"
};

// Helper function to download an SVG
function downloadIcon(name, lucideName) {
  return new Promise((resolve, reject) => {
    const url = `https://cdn.jsdelivr.net/npm/lucide-static@0.400.0/icons/${lucideName}.svg`;
    const dest = path.join(__dirname, `icon_${name}.svg`);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${name} icon: Status code ${response.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

// Download all icons, then run presentation generation
async function main() {
  console.log("Downloading icons...");
  for (const [name, lucideName] of Object.entries(iconsMap)) {
    try {
      await downloadIcon(name, lucideName);
      console.log(`- Downloaded icon_${name}.svg`);
    } catch (err) {
      console.error(`Error downloading icon_${name}.svg:`, err.message);
      // Fallback/continue
    }
  }

  console.log("Generating PPTX...");

  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5

  // ---------- Palette ----------
  const NAVY = "0B1220";
  const NAVY2 = "121A2E";
  const INK = "0F1729";
  const SLATE = "5B6472";
  const LIGHTBG = "F7F8FC";
  const CARD = "FFFFFF";
  const BORDER = "E4E7EF";
  const TEAL = "0EA5A0";
  const TEAL_DK = "0A7A76";
  const GOLD = "D4A24C";
  const INDIGO = "4F5FE8";
  const GREEN = "1FA971";
  const PURPLE = "8B5CF6";
  const WHITE = "FFFFFF";

  const FONT_HEAD = "Cambria";
  const FONT_BODY = "Calibri";
  const FONT_MONO = "Consolas";

  // Use local SVGs
  const ICON = (n) => path.join(__dirname, `icon_${n}.svg`);

  function pageNum(slide, n, dark) {
    slide.addText(`${n}`, {
      x: 12.55, y: 7.12, w: 0.5, h: 0.3,
      fontFace: FONT_BODY, fontSize: 10, color: dark ? "7C8AA5" : "9AA3B2",
      align: "right",
    });
    slide.addText("CareerSync AI", {
      x: 0.5, y: 7.12, w: 3, h: 0.3,
      fontFace: FONT_BODY, fontSize: 9, color: dark ? "5B6C8F" : "AAB2C0",
    });
  }

  function iconCircle(slide, {x, y, d, icon, bg, iconScale = 0.56}) {
    slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
    const iw = d * iconScale;
    slide.addImage({ path: ICON(icon), x: x + (d - iw) / 2, y: y + (d - iw) / 2, w: iw, h: iw });
  }

  function eyebrow(slide, text, color, y = 0.5) {
    slide.addText(text.toUpperCase(), { x: 0.7, y, w: 10, h: 0.3, fontFace: FONT_MONO, fontSize: 11, color, charSpacing: 2 });
  }

  function title(slide, text, color, y = 0.8, size = 30) {
    slide.addText(text, { x: 0.65, y, w: 11.8, h: 0.7, fontFace: FONT_HEAD, fontSize: size, bold: true, color });
  }

  // =====================================================================
  // SLIDE 1 — TITLE
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    const cx = 11.4, cy = 1.3, r = 1.15;
    const bladeColors = [TEAL, INDIGO, GOLD, "2A3555"];
    for (let i = 0; i < 4; i++) {
      s.addShape("blockArc", {
        x: cx - r, y: cy - r, w: r * 2, h: r * 2,
        angleRange: [i * 90 + 6, i * 90 + 84],
        arcThicknessRatio: 0.34,
        fill: { color: bladeColors[i], transparency: i === 3 ? 60 : 30 },
        line: { type: "none" },
      });
    }

    s.addText("5TH SEMESTER SOFTWARE GROUP PROJECT", { x: 0.7, y: 2.15, w: 8.5, h: 0.35, fontFace: FONT_MONO, fontSize: 11.5, color: TEAL, charSpacing: 2 });

    s.addText([
      { text: "CareerSync ", options: { color: WHITE, bold: true } },
      { text: "AI", options: { color: TEAL, bold: true } },
    ], { x: 0.65, y: 2.55, w: 10.5, h: 1.3, fontFace: FONT_HEAD, fontSize: 54, bold: true });

    s.addText("Intelligence That Brings Your Fit Into Focus", { x: 0.7, y: 3.65, w: 10, h: 0.55, fontFace: FONT_BODY, fontSize: 20, italic: true, color: "C7D0E6" });

    s.addText("Deterministic Candidate Ranking with Explainable, Evidence-Backed Evaluation", {
      x: 0.7, y: 4.25, w: 9.5, h: 0.5, fontFace: FONT_BODY, fontSize: 14, color: "97A2BE",
    });

    s.addShape("line", { x: 0.7, y: 5.15, w: 11.9, h: 0, line: { color: "263155", width: 1 } });

    s.addText([
      { text: "B.Tech Information Technology", options: { bold: true, color: WHITE } },
      { text: "   \u00B7   CHARUSAT University", options: { color: "8993AD" } },
    ], { x: 0.7, y: 5.35, w: 11, h: 0.4, fontFace: FONT_BODY, fontSize: 13.5 });

    const chips = [
      { icon: "check", label: "Deterministic" },
      { icon: "eye", label: "Explainable" },
      { icon: "users", label: "Human-in-the-Loop" },
      { icon: "shield", label: "Privacy-Aware" },
    ];
    const chipW = 2.78, chipGap = 0.18, startX = 0.7;
    chips.forEach((c, i) => {
      const x = startX + i * (chipW + chipGap);
      s.addShape("roundRect", { x, y: 6.0, w: chipW, h: 0.95, rectRadius: 0.09, fill: { color: NAVY2 }, line: { color: "263155", width: 1 } });
      iconCircle(s, { x: x + 0.2, y: 6.0 + 0.2, d: 0.55, icon: c.icon, bg: i % 2 === 0 ? TEAL : INDIGO, iconScale: 0.56 });
      s.addText(c.label, { x: x + 0.9, y: 6.0, w: chipW - 1.05, h: 0.95, fontFace: FONT_BODY, fontSize: 12.5, bold: true, color: WHITE, valign: "middle", lineSpacingMultiple: 1.0 });
    });
  }

  // =====================================================================
  // SLIDE 2 — THE RECRUITMENT PROBLEM
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: LIGHTBG };

    eyebrow(s, "The Problem", INDIGO);
    title(s, "The Recruitment Challenge", INK);

    const problems = [
      { icon: "layers", title: "High Screening Volume", color: INDIGO },
      { icon: "clock", title: "Manual Review is Slow", color: TEAL },
      { icon: "eye", title: "Black-Box Ranking is Hard to Justify", color: GOLD },
      { icon: "shield", title: "Candidate Data Needs Privacy-Aware Handling", color: PURPLE },
    ];
    const cw = 2.76, cgap = 0.2, cx0 = 0.7, cy = 1.7, ch = 1.75;
    problems.forEach((p, i) => {
      const x = cx0 + i * (cw + cgap);
      s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.08, fill: { color: CARD }, line: { color: BORDER, width: 1 }, shadow: { type: "outer", color: "1B2340", opacity: 0.1, blur: 10, offset: 4, angle: 90 } });
      iconCircle(s, { x: x + (cw - 0.62) / 2, y: cy + 0.24, d: 0.62, icon: p.icon, bg: p.color, iconScale: 0.55 });
      s.addText(p.title, { x: x + 0.14, y: cy + 1.0, w: cw - 0.28, h: 0.65, fontFace: FONT_BODY, fontSize: 12, bold: true, color: INK, align: "center", lineSpacingMultiple: 1.15 });
    });

    s.addText("WHAT THIS LEADS TO", { x: 0.7, y: 3.75, w: 6, h: 0.3, fontFace: FONT_MONO, fontSize: 10.5, color: SLATE, charSpacing: 1.5 });

    const chain = [
      { label: "Current Approach", sub: "ad-hoc resume review" },
      { label: "Inconsistent Screening", sub: "no repeatable standard" },
      { label: "Decisions Hard to Defend", sub: "no evidence trail" },
    ];
    const chw = 3.55, chgap = 0.5, chx0 = 0.7, chy = 4.15, chh = 1.15;
    chain.forEach((c, i) => {
      const x = chx0 + i * (chw + chgap);
      s.addShape("roundRect", { x, y: chy, w: chw, h: chh, rectRadius: 0.08, fill: { color: INK }, line: { type: "none" } });
      s.addText(c.label, { x: x + 0.2, y: chy + 0.16, w: chw - 0.4, h: 0.45, fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: WHITE, align: "center" });
      s.addText(c.sub, { x: x + 0.2, y: chy + 0.62, w: chw - 0.4, h: 0.4, fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: "97A2BE", align: "center" });
      if (i < 2) {
        s.addText("\u2192", { x: x + chw, y: chy + chh / 2 - 0.2, w: chgap, h: 0.4, fontFace: FONT_BODY, fontSize: 20, color: SLATE, align: "center" });
      }
    });

    s.addShape("roundRect", { x: 0.7, y: 5.75, w: 11.9, h: 0.95, rectRadius: 0.08, fill: { color: "EAF6F5" }, line: { color: TEAL, width: 1 } });
    iconCircle(s, { x: 0.98, y: 5.93, d: 0.6, icon: "target", bg: TEAL, iconScale: 0.55 });
    s.addText([
      { text: "CareerSync AI focuses on ", options: { color: INK } },
      { text: "transparent, evidence-backed candidate evaluation.", options: { bold: true, color: TEAL_DK } },
    ], { x: 1.75, y: 5.75, w: 10.6, h: 0.95, fontFace: FONT_BODY, fontSize: 14, valign: "middle" });

    pageNum(s, 2, false);
  }

  // =====================================================================
  // SLIDE 3 — HOW CAREERSYNC AI WORKS (WORKFLOW)
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    eyebrow(s, "How CareerSync AI Works", TEAL);
    title(s, "End-to-End Platform Workflow", WHITE);

    s.addText("RECRUITER-DRIVEN FLOW", { x: 0.7, y: 1.55, w: 6, h: 0.28, fontFace: FONT_MONO, fontSize: 10, color: "8993AD", charSpacing: 1.5 });

    const flow = [
      "Create Job +\nDefine Requirements",
      "Resume /\nCandidate Profile",
      "NLP\nExtraction",
      "Semantic\nRetrieval",
      "Deterministic\nScoring",
      "Ranked\nCandidates",
      "Evidence\nInspection",
      "Final\nDecision",
    ];
    const fw = 1.395, fgap = 0.09, fx0 = 0.7, fy = 1.9, fh = 1.5;
    flow.forEach((f, i) => {
      const x = fx0 + i * (fw + fgap);
      const isEnd = i === flow.length - 1;
      s.addShape("roundRect", { x, y: fy, w: fw, h: fh, rectRadius: 0.06, fill: { color: isEnd ? TEAL : NAVY2 }, line: { color: isEnd ? TEAL : "263155", width: 1.25 } });
      s.addText(String(i + 1), { x: x + 0.1, y: fy + 0.08, w: 0.7, h: 0.3, fontFace: FONT_MONO, fontSize: 11, bold: true, color: isEnd ? WHITE : TEAL });
      s.addText(f, { x: x + 0.08, y: fy + 0.4, w: fw - 0.16, h: 0.95, fontFace: FONT_BODY, fontSize: 9.7, bold: true, color: WHITE, align: "center", valign: "middle", lineSpacingMultiple: 1.1 });
      if (i < flow.length - 1) {
        s.addText("\u2192", { x: x + fw - 0.02, y: fy + fh / 2 - 0.14, w: fgap + 0.04, h: 0.3, fontFace: FONT_BODY, fontSize: 11, color: "5B6C8F", align: "center" });
      }
    });

    s.addText("PLATFORM ROLES", { x: 0.7, y: 3.85, w: 6, h: 0.28, fontFace: FONT_MONO, fontSize: 10, color: "8993AD", charSpacing: 1.5 });

    const roles = [
      { icon: "briefcase", label: "Recruiter", color: TEAL, desc: "Creates jobs, sets weighted requirements, reviews ranked candidates, inspects evidence, makes the final decision." },
      { icon: "user", label: "Applicant", color: GOLD, desc: "Builds a profile, uploads a resume, applies to roles, and tracks application status." },
    ];
    const rw = 5.83, rgap = 0.24, rx = 0.7, ry = 4.2, rh = 1.5;
    roles.forEach((r, i) => {
      const x = rx + i * (rw + rgap);
      s.addShape("roundRect", { x, y: ry, w: rw, h: rh, rectRadius: 0.08, fill: { color: NAVY2 }, line: { color: "263155", width: 1 } });
      iconCircle(s, { x: x + 0.26, y: ry + 0.26, d: 0.62, icon: r.icon, bg: r.color, iconScale: 0.55 });
      s.addText(r.label, { x: x + 1.05, y: ry + 0.2, w: rw - 1.3, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: WHITE });
      s.addText(r.desc, { x: x + 1.05, y: ry + 0.6, w: rw - 1.3, h: 0.8, fontFace: FONT_BODY, fontSize: 11, color: "A6B0CB", lineSpacingMultiple: 1.25 });
    });

    s.addShape("roundRect", { x: 0.7, y: 5.9, w: 11.9, h: 0.78, rectRadius: 0.08, fill: { color: "1A2340" }, line: { color: "2A345A", width: 1 } });
    iconCircle(s, { x: 0.95, y: 6.03, d: 0.52, icon: "settings", bg: INDIGO, iconScale: 0.56 });
    s.addText([
      { text: "Admin  ", options: { bold: true, color: WHITE } },
      { text: "\u2014  Platform operations, access & role management, audit visibility", options: { color: "97A2BE" } },
    ], { x: 1.65, y: 5.9, w: 10.7, h: 0.78, fontFace: FONT_BODY, fontSize: 12.5, valign: "middle" });

    pageNum(s, 3, true);
  }

  // =====================================================================
  // SLIDE 4 — SYSTEM ARCHITECTURE
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: LIGHTBG };

    eyebrow(s, "System Design", INDIGO);
    title(s, "Proposed System Architecture", INK);

    const layers = [
      { label: "Presentation Layer", sub: "Recruiter Dashboard \u00B7 Applicant Portal \u00B7 Admin Console", tech: "Next.js / React / TypeScript", color: INDIGO, icon: "layers" },
      { label: "API & Security Layer", sub: "Authentication, authorization, request handling", tech: "FastAPI \u00B7 Pydantic \u00B7 JWT \u00B7 RBAC", color: TEAL, icon: "lock" },
      { label: "Processing Layer", sub: "Background & asynchronous task execution", tech: "Redis \u00B7 Celery Workers", color: GOLD, icon: "clock" },
      { label: "AI / NLP Layer", sub: "Extraction, normalization, semantic retrieval", tech: "Docling \u00B7 GLiNER \u00B7 RapidFuzz \u00B7 BGE-M3", color: PURPLE, icon: "cpu" },
      { label: "Data Layer", sub: "Persistent storage & vector search", tech: "PostgreSQL \u00B7 pgvector \u00B7 Object Storage", color: TEAL_DK, icon: "database" },
    ];
    const lx = 0.7, lyStart = 1.65, lw = 11.9, lh = 0.86, lgap = 0.13;
    layers.forEach((l, i) => {
      const y = lyStart + i * (lh + lgap);
      s.addShape("roundRect", { x: lx, y, w: lw, h: lh, rectRadius: 0.07, fill: { color: CARD }, line: { color: l.color, width: 1.4 }, shadow: { type: "outer", color: "1B2340", opacity: 0.08, blur: 8, offset: 3, angle: 90 } });
      iconCircle(s, { x: lx + 0.2, y: y + (lh - 0.56) / 2, d: 0.56, icon: l.icon, bg: l.color, iconScale: 0.55 });
      s.addText(l.label, { x: lx + 0.94, y: y + 0.1, w: 3.6, h: 0.35, fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: INK });
      s.addText(l.sub, { x: lx + 0.94, y: y + 0.46, w: 4.5, h: 0.35, fontFace: FONT_BODY, fontSize: 10, color: SLATE });
      s.addText(l.tech, { x: lx + 6.6, y, w: lw - 6.9, h: lh, fontFace: FONT_MONO, fontSize: 10.5, bold: true, color: l.color, valign: "middle", align: "right" });
    });

    const fy2 = lyStart + 5 * (lh + lgap) + 0.15;
    s.addShape("roundRect", { x: 0.7, y: fy2, w: 11.9, h: 0.62, rectRadius: 0.31, fill: { color: INK }, line: { type: "none" } });
    s.addText("Frontend  \u2192  API  \u2192  Processing / NLP  \u2192  Retrieval  \u2192  Scoring  \u2192  Database", {
      x: 0.7, y: fy2, w: 11.9, h: 0.62, fontFace: FONT_MONO, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle",
    });

    pageNum(s, 4, false);
  }

  // =====================================================================
  // SLIDE 5 — NLP + SEMANTIC RETRIEVAL PIPELINE
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    eyebrow(s, "AI / NLP Pipeline", TEAL);
    title(s, "AI / NLP and Semantic Retrieval Pipeline", WHITE);

    const stages = [
      { icon: "file", title: "Document Processing", sub: "Resume PDF/DOCX \u2192 structured text", tech: "Docling", color: TEAL },
      { icon: "search", title: "Entity Extraction", sub: "Skills, education, experience, roles", tech: "GLiNER", color: INDIGO },
      { icon: "layers", title: "Skill Normalization", sub: "Aliases \u2192 canonical skill form", tech: "RapidFuzz", color: GOLD },
      { icon: "database", title: "Embedding + Retrieval", sub: "Vector similarity \u2192 relevant evidence", tech: "BGE-M3 \u00B7 pgvector", color: PURPLE },
      { icon: "check", title: "Evidence Output", sub: "Structured snippets \u2192 scoring engine", tech: "", color: GREEN },
    ];

    const cw = 2.24, cgap = 0.13, cx0 = 0.7, cy = 1.95, ch = 3.35;
    stages.forEach((st, i) => {
      const x = cx0 + i * (cw + cgap);
      s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.08, fill: { color: NAVY2 }, line: { color: "263155", width: 1 } });
      s.addText(`0${i + 1}`, { x: x + 0.16, y: cy + 0.14, w: 1, h: 0.32, fontFace: FONT_MONO, fontSize: 13, bold: true, color: st.color });
      iconCircle(s, { x: x + (cw - 0.68) / 2, y: cy + 0.55, d: 0.68, icon: st.icon, bg: st.color, iconScale: 0.52 });
      s.addText(st.title, { x: x + 0.14, y: cy + 1.38, w: cw - 0.28, h: 0.55, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: WHITE, align: "center", lineSpacingMultiple: 1.05 });
      s.addText(st.sub, { x: x + 0.14, y: cy + 1.95, w: cw - 0.28, h: 0.75, fontFace: FONT_BODY, fontSize: 8.7, color: "A6B0CB", align: "center", lineSpacingMultiple: 1.2 });
      if (st.tech) {
        s.addText(st.tech, { x: x + 0.12, y: cy + ch - 0.42, w: cw - 0.24, h: 0.3, fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: st.color, align: "center" });
      }
      if (i < stages.length - 1) {
        s.addShape("ellipse", { x: x + cw - 0.14, y: cy + ch / 2 - 0.14, w: 0.28, h: 0.28, fill: { color: NAVY }, line: { color: "3A4568", width: 1.25 } });
        s.addText("\u2192", { x: x + cw - 0.14, y: cy + ch / 2 - 0.17, w: 0.28, h: 0.28, fontFace: FONT_BODY, fontSize: 11, bold: true, color: "9AA6C2", align: "center", valign: "middle" });
      }
    });

    s.addShape("roundRect", { x: 0.7, y: cy + ch + 0.3, w: 11.9, h: 0.85, rectRadius: 0.08, fill: { color: "16233F" }, line: { color: TEAL, width: 1 } });
    iconCircle(s, { x: 0.98, y: cy + ch + 0.3 + 0.13, d: 0.58, icon: "eye", bg: TEAL, iconScale: 0.55 });
    s.addText([
      { text: "AI supports evidence extraction and retrieval. ", options: { bold: true, color: WHITE } },
      { text: "It does not replace the deterministic ranking rules.", options: { color: "C7D0E6" } },
    ], { x: 1.72, y: cy + ch + 0.3, w: 10.6, h: 0.85, fontFace: FONT_BODY, fontSize: 13, valign: "middle" });

    pageNum(s, 5, true);
  }

  // =====================================================================
  // SLIDE 6 — DETERMINISTIC SCORING
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: LIGHTBG };

    eyebrow(s, "Scoring Engine", INDIGO);
    title(s, "Deterministic Scoring and Transparent Ranking", INK);

    s.addShape("roundRect", { x: 0.7, y: 1.6, w: 11.9, h: 1.05, rectRadius: 0.08, fill: { color: INK }, line: { type: "none" } });
    s.addText([
      { text: "Overall Score", options: { color: TEAL, bold: true } },
      { text: " = (W", options: { color: WHITE } },
      { text: "skill", options: { color: "8993AD", fontSize: 12 } },
      { text: " \u00D7 Skill Score) + (W", options: { color: WHITE } },
      { text: "exp", options: { color: "8993AD", fontSize: 12 } },
      { text: " \u00D7 Experience Score) + (W", options: { color: WHITE } },
      { text: "edu", options: { color: "8993AD", fontSize: 12 } },
      { text: " \u00D7 Education Score) + (W", options: { color: WHITE } },
      { text: "sem", options: { color: "8993AD", fontSize: 12 } },
      { text: " \u00D7 Semantic Score)", options: { color: WHITE } },
    ], { x: 1.0, y: 1.6, w: 11.3, h: 1.05, fontFace: FONT_MONO, fontSize: 15.5, valign: "middle" });

    const dims = [
      { icon: "target", label: "Skills", color: TEAL },
      { icon: "briefcase", label: "Experience", color: INDIGO },
      { icon: "layers", label: "Education", color: GOLD },
      { icon: "search", label: "Semantic Similarity", color: PURPLE },
    ];
    const dw = 2.84, dgap = 0.2, dx0 = 0.7, dy = 2.85;
    dims.forEach((d, i) => {
      const x = dx0 + i * (dw + dgap);
      s.addShape("roundRect", { x, y: dy, w: dw, h: 1.1, rectRadius: 0.08, fill: { color: CARD }, line: { color: BORDER, width: 1 }, shadow: { type: "outer", color: "1B2340", opacity: 0.1, blur: 8, offset: 3, angle: 90 } });
      iconCircle(s, { x: x + 0.2, y: dy + 0.24, d: 0.6, icon: d.icon, bg: d.color, iconScale: 0.55 });
      s.addText(d.label, { x: x + 0.94, y: dy, w: dw - 1.1, h: 1.1, fontFace: FONT_HEAD, fontSize: 13.5, bold: true, color: INK, valign: "middle", lineSpacingMultiple: 1.0 });
    });

    const rules = [
      "Weights are recruiter-controlled",
      "Weights sum to exactly 100%",
      "Same inputs + same weights \u2192 reproducible score",
      "Evidence supports each scoring component",
    ];
    const rw2 = 5.85, rgap2 = 0.2, rx0 = 0.7, ry0 = 4.15, rh0 = 0.55;
    rules.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = rx0 + col * (rw2 + rgap2);
      const y = ry0 + row * (rh0 + 0.15);
      s.addShape("roundRect", { x, y, w: rw2, h: rh0, rectRadius: 0.06, fill: { color: CARD }, line: { color: BORDER, width: 1 } });
      iconCircle(s, { x: x + 0.14, y: y + 0.11, d: 0.33, icon: "check", bg: TEAL, iconScale: 0.6 });
      s.addText(r, { x: x + 0.6, y, w: rw2 - 0.75, h: rh0, fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: INK, valign: "middle" });
    });

    s.addText("ILLUSTRATIVE EXAMPLE \u2014 NOT MEASURED SYSTEM RESULTS", { x: 0.7, y: 5.35, w: 8, h: 0.3, fontFace: FONT_MONO, fontSize: 9.5, color: SLATE, charSpacing: 1 });
    const rows = [
      ["Candidate A", "82%"],
      ["Candidate B", "72%"],
    ];
    let ry = 5.68;
    rows.forEach((r) => {
      s.addShape("roundRect", { x: 0.7, y: ry, w: 11.9, h: 0.42, rectRadius: 0.05, fill: { color: CARD }, line: { color: BORDER, width: 0.75 } });
      s.addText(r[0], { x: 0.95, y: ry, w: 5, h: 0.42, fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: INK, valign: "middle" });
      s.addShape("roundRect", { x: 9.4, y: ry + 0.06, w: 2.2, h: 0.3, rectRadius: 0.15, fill: { color: "EAF6F5" }, line: { type: "none" } });
      s.addText(r[1], { x: 9.4, y: ry + 0.06, w: 2.2, h: 0.3, fontFace: FONT_MONO, fontSize: 11, bold: true, color: TEAL_DK, valign: "middle", align: "center" });
      s.addText("relative score", { x: 11.15, y: ry, w: 1.3, h: 0.42, fontFace: FONT_BODY, fontSize: 9, italic: true, color: SLATE, valign: "middle" });
      ry += 0.49;
    });

    pageNum(s, 6, false);
  }

  // =====================================================================
  // SLIDE 7 — CURRENT IMPLEMENTATION STATUS
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    eyebrow(s, "Project Status", TEAL);
    title(s, "Software Engineering Foundation and Current Status", WHITE);

    const cols = [
      {
        label: "COMPLETED", color: GREEN, icon: "check",
        items: ["Recruiter dashboard", "Job management interface", "Candidate ranking view", "Applicant portal", "Frontend theme & motion system"],
      },
      {
        label: "IN PROGRESS", color: GOLD, icon: "clock",
        items: ["Backend API endpoints", "Frontend \u2194 backend integration", "AI / NLP workers", "Semantic retrieval implementation", "Model integration"],
      },
      {
        label: "PLANNED / NEXT", color: INDIGO, icon: "branch",
        items: ["End-to-end pipeline testing", "Deployment hardening", "Extended evaluation & feedback"],
      },
    ];
    const cw = 3.83, cgap = 0.2, cx0 = 0.7, cy = 1.65, ch = 4.25;
    cols.forEach((c, ci) => {
      const x = cx0 + ci * (cw + cgap);
      s.addShape("roundRect", { x, y: cy, w: cw, h: ch, rectRadius: 0.08, fill: { color: NAVY2 }, line: { color: c.color, width: 1.4 } });
      iconCircle(s, { x: x + 0.22, y: cy + 0.22, d: 0.55, icon: c.icon, bg: c.color, iconScale: 0.56 });
      s.addText(c.label, { x: x + 0.9, y: cy + 0.24, w: cw - 1.1, h: 0.5, fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: WHITE, valign: "middle" });
      const bullets = c.items.map((t, idx) => ({ text: t, options: { bullet: { code: "25AA", indent: 14 }, color: "C7D0E6", fontSize: 12, breakLine: idx < c.items.length - 1, paraSpaceAfter: 10 } }));
      s.addText(bullets, { x: x + 0.28, y: cy + 0.95, w: cw - 0.5, h: ch - 1.1, fontFace: FONT_BODY, valign: "top" });
    });

    s.addText("SUPPORTING TECHNOLOGIES", { x: 0.7, y: cy + ch + 0.2, w: 6, h: 0.28, fontFace: FONT_MONO, fontSize: 10, color: "8993AD", charSpacing: 1.5 });
    s.addText("Next.js  \u00B7  React  \u00B7  TypeScript  \u00B7  FastAPI  \u00B7  Python  \u00B7  PostgreSQL  \u00B7  Redis  \u00B7  Celery  \u00B7  Docling  \u00B7  GLiNER  \u00B7  RapidFuzz  \u00B7  BGE-M3", {
      x: 0.7, y: cy + ch + 0.5, w: 11.9, h: 0.4, fontFace: FONT_MONO, fontSize: 10.5, color: TEAL,
    });

    pageNum(s, 7, true);
  }

  // =====================================================================
  // SLIDE 8 — WHY CAREERSYNC AI IS DIFFERENT
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: LIGHTBG };

    eyebrow(s, "Design Philosophy", INDIGO);
    title(s, "CareerSync AI: Evidence Before Decisions", INK);

    const principles = [
      { icon: "check", title: "Deterministic", color: TEAL, body: "Explicit scoring rules make rankings reproducible." },
      { icon: "eye", title: "Explainable", color: INDIGO, body: "Scores connect back to supporting resume evidence." },
      { icon: "shield", title: "Privacy-Aware", color: GOLD, body: "Sensitive candidate information is handled deliberately." },
      { icon: "activity", title: "Auditable", color: PURPLE, body: "Important actions and decisions can be recorded for accountability." },
      { icon: "users", title: "Human-in-the-Loop", color: GREEN, body: "AI supports the recruiter; the recruiter retains final authority." },
    ];

    const pw = 2.24, pgap = 0.14, px0 = 0.7, py = 1.65, ph = 2.75;
    principles.forEach((p, i) => {
      const x = px0 + i * (pw + pgap);
      s.addShape("roundRect", { x, y: py, w: pw, h: ph, rectRadius: 0.08, fill: { color: CARD }, line: { color: BORDER, width: 1 }, shadow: { type: "outer", color: "1B2340", opacity: 0.08, blur: 8, offset: 3, angle: 90 } });
      iconCircle(s, { x: x + (pw - 0.68) / 2, y: py + 0.24, d: 0.68, icon: p.icon, bg: p.color, iconScale: 0.55 });
      s.addText(p.title, { x: x + 0.12, y: py + 1.08, w: pw - 0.24, h: 0.4, fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: INK, align: "center" });
      s.addText(p.body, { x: x + 0.15, y: py + 1.5, w: pw - 0.3, h: 1.15, fontFace: FONT_BODY, fontSize: 9.7, color: SLATE, align: "center", lineSpacingMultiple: 1.25 });
    });

    s.addShape("roundRect", { x: 0.7, y: 4.65, w: 11.9, h: 1.6, rectRadius: 0.08, fill: { color: INK }, line: { type: "none" } });
    s.addText("THE CENTRAL PRINCIPLE", { x: 1.0, y: 4.85, w: 6, h: 0.3, fontFace: FONT_MONO, fontSize: 10.5, color: TEAL, charSpacing: 1.5 });

    const central = ["AI provides\nevidence + retrieval", "Rules calculate\nthe score", "Recruiter makes the\nfinal decision"];
    const ccw = 3.35, ccgap = 0.4, ccx0 = 1.0, ccy = 5.25, cch = 0.85;
    central.forEach((c, i) => {
      const x = ccx0 + i * (ccw + ccgap);
      s.addShape("roundRect", { x, y: ccy, w: ccw, h: cch, rectRadius: 0.42, fill: { color: i === 2 ? TEAL : NAVY2 }, line: { color: i === 2 ? TEAL : "3A4568", width: 1.25 } });
      s.addText(c, { x, y: ccy, w: ccw, h: cch, fontFace: FONT_BODY, fontSize: 12.5, bold: true, color: WHITE, align: "center", valign: "middle", lineSpacingMultiple: 1.05 });
      if (i < 2) {
        s.addText("\u2192", { x: x + ccw, y: ccy + cch / 2 - 0.18, w: ccgap, h: 0.36, fontFace: FONT_BODY, fontSize: 16, color: "8993AD", align: "center" });
      }
    });

    pageNum(s, 8, false);
  }

  // =====================================================================
  // SLIDE 9 — CONCLUSION / CONTRIBUTION
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    eyebrow(s, "Conclusion", TEAL);
    title(s, "What CareerSync AI Contributes", WHITE);

    const contributions = [
      { icon: "file", text: "Converts unstructured resumes into structured evidence" },
      { icon: "search", text: "Uses semantic retrieval to find relevant candidate evidence" },
      { icon: "target", text: "Produces deterministic and explainable rankings" },
      { icon: "users", text: "Keeps the recruiter in control of the final decision" },
    ];
    const cw = 5.85, cgap = 0.2, cx0 = 0.7, cy = 1.7, ch = 1.0;
    contributions.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = cx0 + col * (cw + cgap);
      const y = cy + row * (ch + 0.2);
      s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.07, fill: { color: NAVY2 }, line: { color: "263155", width: 1 } });
      iconCircle(s, { x: x + 0.2, y: y + (ch - 0.55) / 2, d: 0.55, icon: c.icon, bg: TEAL, iconScale: 0.55 });
      s.addText(c.text, { x: x + 0.92, y, w: cw - 1.1, h: ch, fontFace: FONT_BODY, fontSize: 12.5, bold: true, color: WHITE, valign: "middle", lineSpacingMultiple: 1.15 });
    });

    s.addText("THE JOURNEY, END TO END", { x: 0.7, y: 4.15, w: 6, h: 0.28, fontFace: FONT_MONO, fontSize: 10, color: "8993AD", charSpacing: 1.5 });

    const journey = ["Resume +\nRequirements", "Evidence", "Transparent\nScore", "Explainable\nRanking", "Human\nDecision"];
    const jw = 2.15, jgap = 0.22, jx0 = 0.7, jy = 4.5, jh = 1.0;
    journey.forEach((j, i) => {
      const x = jx0 + i * (jw + jgap);
      const isLast = i === journey.length - 1;
      s.addShape("roundRect", { x, y: jy, w: jw, h: jh, rectRadius: 0.5, fill: { color: isLast ? TEAL : NAVY2 }, line: { color: isLast ? TEAL : "3A4568", width: 1.25 } });
      s.addText(j, { x, y: jy, w: jw, h: jh, fontFace: FONT_BODY, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle", lineSpacingMultiple: 1.05 });
      if (i < journey.length - 1) {
        s.addText("\u2192", { x: x + jw - 0.02, y: jy + jh / 2 - 0.16, w: jgap + 0.04, h: 0.32, fontFace: FONT_BODY, fontSize: 14, color: "8993AD", align: "center" });
      }
    });

    s.addShape("roundRect", { x: 0.7, y: 5.85, w: 11.9, h: 0.85, rectRadius: 0.08, fill: { color: "16233F" }, line: { color: TEAL, width: 1 } });
    s.addText("CareerSync AI is designed to make candidate ranking more transparent, reproducible, and evidence-driven.", {
      x: 1.0, y: 5.85, w: 11.3, h: 0.85, fontFace: FONT_HEAD, fontSize: 14, italic: true, bold: true, color: WHITE, valign: "middle", align: "center",
    });

    pageNum(s, 9, true);
  }

  // =====================================================================
  // SLIDE 10 — THANK YOU
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    const cx = 6.65, cy = 2.35, r = 1.7;
    const bladeColors = [TEAL, INDIGO, GOLD, "2A3555"];
    for (let i = 0; i < 4; i++) {
      s.addShape("blockArc", {
        x: cx - r, y: cy - r, w: r * 2, h: r * 2,
        angleRange: [i * 90 + 6, i * 90 + 84],
        arcThicknessRatio: 0.28,
        fill: { color: bladeColors[i], transparency: 78 },
        line: { type: "none" },
      });
    }

    s.addText("Thank You", { x: 0, y: 2.85, w: 13.3, h: 1.1, fontFace: FONT_HEAD, fontSize: 48, bold: true, color: WHITE, align: "center" });
    s.addText("Questions & Discussion", { x: 0, y: 3.85, w: 13.3, h: 0.6, fontFace: FONT_BODY, fontSize: 18, italic: true, color: "C7D0E6", align: "center" });

    s.addShape("line", { x: 5.65, y: 4.75, w: 2, h: 0, line: { color: "3A4568", width: 1 } });

    s.addText([
      { text: "CareerSync AI", options: { bold: true, color: TEAL, breakLine: true } },
      { text: "5th Semester Software Group Project", options: { color: "8993AD" } },
    ], { x: 0, y: 4.95, w: 13.3, h: 0.7, fontFace: FONT_BODY, fontSize: 13, align: "center", lineSpacingMultiple: 1.4 });
  }

  // Save at workspace root
  const outputPath = path.resolve(__dirname, "..", "CareerSync-AI-Viva.pptx");
  pres.writeFile({ fileName: outputPath }).then(() => {
    console.log("done! Presentation saved to:", outputPath);
  }).catch((err) => {
    console.error("Error writing presentation file:", err);
  });
}

main().catch(console.error);
