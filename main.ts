import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  Editor,
  MarkdownView,
  Menu,
  MenuItem,
  requestUrl,
  Notice,
  Modal,
  TextComponent,
  TextAreaComponent
} from "obsidian";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface OllamaSettings {
  ollamaUrl: string;
  ollamaModel: string;
  customPrompts: string;
  variationsMode: boolean;
  variationsCount: number;
  maxOutputSentences: number;
  promptStates: Record<string, "off" | "single" | "combined">;
}

interface OllamaGenerateResponse {
  response: string;
}

interface PromptEntry {
  name: string;
  template: string;
}

interface OutputCandidate {
  text: string;
  sourceNames: string[];
}

interface PromptSelectionResult {
  individual: PromptEntry[];
  combined: PromptEntry[];
}

type CaptureMode =
  | "selection"
  | "sentence"
  | "finish-fragment"
  | "predict-next";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_INPUT_WORDS       = 512;
const OLLAMA_TIMEOUT_MS     = 120_000;
const DEFAULT_PREDICT_COUNT = 3;
const SNAP_LOOKAHEAD        = 3;

const TERMINAL_PUNCT = /[.!?…]/;
const OPENING_QUOTES = /["""''«‹(]/;
const CLOSING_QUOTES = /["""''»›)]/;

const DEFAULT_SETTINGS: OllamaSettings = {
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.1:8b",
  customPrompts: [
    "Fix Grammar | Fix the grammar and spelling in this text. Return ONLY the corrected text, no explanation: []",
    "Remove AI Tells | Rewrite this text to remove all signs of AI-generated language. Remove ALL EM DASHES; ban the words prowess, tapestry, delve, realm, and adept; remove \"It's not just X, it's Y\" patterns; remove hollow filler phrases. Return ONLY the cleaned text: []",
    "Cut Clutter | Rewrite this text to remove unnecessary words, filler phrases, and redundant expressions. Keep every idea but make each sentence leaner. Return ONLY the rewritten text: []",
    "Concretise | Replace abstract or vague words and phrases with specific, concrete alternatives. Return ONLY the rewritten text: []",
    "Active Voice | Rewrite every passive construction as active voice unless the passive is clearly intentional for emphasis. Return ONLY the rewritten text: []",
    "Tighten Dialogue | Rewrite this dialogue so each line sounds like a real person speaking. Cut anything that sounds stiff, theatrical, or like a speech. Keep the meaning. Return ONLY the rewritten dialogue: []",
    "Sensory Detail | Expand this passage by weaving in specific sensory details: what the character sees, hears, smells, tastes, or physically feels. Do not summarise the senses, show them concretely. Return ONLY the rewritten text: []",
    "Show Don't Tell | Rewrite this passage to dramatise the emotion or state rather than naming it directly. Return ONLY the rewritten text: []",
    "Vary Sentence Length | Rewrite this text so that sentence lengths vary noticeably. Mix short punchy sentences with longer ones. Return ONLY the rewritten text: []",
    "Fix Grammar (Preserve Voice) | Fix only clear grammar and spelling errors in this text. Do not change the author's style, sentence rhythm, or word choices unless they are outright wrong. Return ONLY the corrected text: []",
    "Strengthen the Lead | Rewrite the opening sentence or two so it hooks the reader immediately with a specific detail, a surprising fact, a concrete moment, or a question. Return ONLY the rewritten opening: []",
    "Fix the Ending | Rewrite the final sentence or two so the ending lands cleanly and with purpose. Return ONLY the rewritten ending: []",
    "Unify the Paragraph | Rewrite this paragraph so every sentence serves one clear idea. Remove any sentence that drifts off-topic. Return ONLY the rewritten paragraph: []",
    "Add a Topic Sentence | Add a clear, direct topic sentence to the start of this paragraph. Do not use metadiscourse phrases. Return ONLY the paragraph with the new topic sentence added: []",
    "Cut Metadiscourse | Remove all metadiscourse from this text. Make each sentence do the work directly. Return ONLY the rewritten text: []",
    "Unpack Jargon | Rewrite this text so a non-specialist can understand it. Return ONLY the rewritten text: []",
    "Formal Register | Rewrite in a formal academic or professional register. Return ONLY the rewritten text: []",
    "Informal / Conversational | Rewrite in a natural, conversational tone. Use contractions where natural. Return ONLY the rewritten text: []",
    "Tense Consistency | Rewrite so the tense is consistent throughout unless a shift is clearly justified. Return ONLY the corrected text: []",
    "Signpost the Logic | Make the logical flow between sentences explicit with transitional words or bridge sentences. Return ONLY the rewritten text: []",
    "Write a Profile Opening | Using the text below as background, write a short vivid profile opening of two to three sentences. Start with the person in action, not their name or title. Return ONLY the profile opening: []",
    "Write a Place Description | Using the details in this text, write a short descriptive paragraph about this place using specific sensory details. Return ONLY the description: []",
    "Summarise in One Sentence | Summarise the core idea in a single clear sentence of no more than twenty-five words. Return ONLY that sentence: []",
    "Summarise in One Paragraph | Summarise in one short paragraph of three to five sentences. Return ONLY the summary paragraph: []",
    "Expand with Examples | Add one or two short concrete examples that illustrate the main point. Return ONLY the expanded text: []",
    "Trim to Half | Cut to approximately half the current length. Keep every important idea. Return ONLY the trimmed text: []",
    "Dialogue to Prose | Convert this dialogue into a short prose passage in close third-person. Return ONLY the prose passage: []",
    "Prose to Dialogue | Rewrite as a short dialogue exchange between two characters. Return ONLY the dialogue: []",
  ].join("\n"),
  variationsMode: false,
  variationsCount: 5,
  maxOutputSentences: 0,
  promptStates: {}
};

// ─────────────────────────────────────────────
// Per-prompt descriptions
// ─────────────────────────────────────────────

const PROMPT_INFO: Record<string, { description: string; example: string }> = {
  "Fix Grammar": {
    description: "Corrects spelling mistakes and grammatical errors.",
    example: "Before: \"She runned to the store and buyed milk.\"\nAfter:  \"She ran to the store and bought milk.\""
  },
  "Remove AI Tells": {
    description: "Strips AI writing patterns: em dashes, banned words, hollow filler phrases.",
    example: "Before: \"It's not just a tool — it's a way to delve into your own prowess.\"\nAfter:  \"It's a tool that helps you understand your own strengths.\""
  },
  "Cut Clutter": {
    description: "Removes filler words, redundant phrases, and padding.",
    example: "Before: \"Due to the fact that it was raining, we decided to stay inside.\"\nAfter:  \"Because it was raining, we stayed inside.\""
  },
  "Concretise": {
    description: "Swaps vague or abstract words for specific, tangible ones.",
    example: "Before: \"She placed the object on the surface.\"\nAfter:  \"She placed the coffee mug on the kitchen counter.\""
  },
  "Active Voice": {
    description: "Rewrites passive constructions so the subject acts.",
    example: "Before: \"The report was written by the team.\"\nAfter:  \"The team wrote the report.\""
  },
  "Tighten Dialogue": {
    description: "Makes dialogue sound like real speech.",
    example: "Before: \"I must confess that I am rather displeased.\"\nAfter:  \"I'm not happy about this.\""
  },
  "Sensory Detail": {
    description: "Adds specific sensory details to bring a scene alive.",
    example: "Before: \"The kitchen was warm.\"\nAfter:  \"The kitchen smelled of burnt butter and the radiator ticked.\""
  },
  "Show Don't Tell": {
    description: "Replaces stated emotions with physical signs that imply them.",
    example: "Before: \"She was nervous.\"\nAfter:  \"Her hands wouldn't stay still.\""
  },
  "Vary Sentence Length": {
    description: "Mixes short and long sentences to create rhythm.",
    example: "Before: \"He walked. He opened it. He stepped outside.\"\nAfter:  \"He walked to the door and opened it. He stepped outside. The cold hit him.\""
  },
  "Fix Grammar (Preserve Voice)": {
    description: "Fixes only clear-cut errors. Leaves your sentence rhythm, vocabulary, and style untouched.",
    example: "Before: \"He don't care about nothing no more.\"\nAfter:  \"He doesn't care about anything anymore.\""
  },
  "Strengthen the Lead": {
    description: "Rewrites the opening to hook immediately with something specific.",
    example: "Before: \"Tourism is important to many economies.\"\nAfter:  \"On a Tuesday in March, the last hotel on the island closed.\""
  },
  "Fix the Ending": {
    description: "Rewrites closing lines so the piece ends with purpose.",
    example: "Before: \"Overall, it was interesting and taught me a lot.\"\nAfter:  \"I still think about the way the light looked that afternoon.\""
  },
  "Unify the Paragraph": {
    description: "Removes sentences that drift off the paragraph's main idea.",
    example: "Before: \"The park was quiet. Birds sang. The council plans to add a car park.\"\nAfter:  \"The park was quiet. Birds sang.\""
  },
  "Add a Topic Sentence": {
    description: "Adds a clear opening sentence stating what the paragraph is about.",
    example: "Before: \"Prices rose. Wages stagnated. Savings shrank.\"\nAfter:  \"The cost of living squeezed households. Prices rose. Wages stagnated.\""
  },
  "Cut Metadiscourse": {
    description: "Removes phrases that describe what the writing will do instead of just doing it.",
    example: "Before: \"In this section I will explain why the policy failed.\"\nAfter:  \"The policy failed for three reasons.\""
  },
  "Unpack Jargon": {
    description: "Rewrites technical language into plain English.",
    example: "Before: \"The API returns a 401 on unauthenticated requests.\"\nAfter:  \"The system rejects requests from users who haven't logged in.\""
  },
  "Formal Register": {
    description: "Converts casual writing to formal academic or professional English.",
    example: "Before: \"Honestly it's a bit all over the place.\"\nAfter:  \"The argument lacks coherence.\""
  },
  "Informal / Conversational": {
    description: "Loosens formal writing into natural, friendly speech.",
    example: "Before: \"It is advisable to consult a medical professional.\"\nAfter:  \"Talk to a doctor first.\""
  },
  "Tense Consistency": {
    description: "Finds and fixes unintentional verb tense shifts.",
    example: "Before: \"She walked in and sits down.\"\nAfter:  \"She walked in and sat down.\""
  },
  "Signpost the Logic": {
    description: "Adds transitional words and bridge sentences.",
    example: "Before: \"Sales fell. The team hired three new reps.\"\nAfter:  \"Sales fell. As a result, the team hired three new reps.\""
  },
  "Write a Profile Opening": {
    description: "Writes a vivid profile opener starting with the person in action.",
    example: "Input: Notes about a chef.\nAfter:  \"At 5 a.m., before the fish market opens, she's already tasting the broth.\""
  },
  "Write a Place Description": {
    description: "Writes a sensory paragraph about a place using the supplied details.",
    example: "Input: Notes about a bus depot.\nAfter:  \"The depot smelled of diesel and damp concrete.\""
  },
  "Summarise in One Sentence": {
    description: "Distils the entire text into one sentence of 25 words or fewer.",
    example: "Before: (400-word article)\nAfter:  \"Cities that invest in bike lanes see fewer car trips.\""
  },
  "Summarise in One Paragraph": {
    description: "Produces a 3-5 sentence summary.",
    example: "Before: (long report)\nAfter:  \"The report examines three causes of staff turnover…\""
  },
  "Expand with Examples": {
    description: "Adds one or two short concrete examples to illustrate the main point.",
    example: "Before: \"Good onboarding reduces churn.\"\nAfter:  \"Good onboarding reduces churn. Slack walks new users through their first channel.\""
  },
  "Trim to Half": {
    description: "Cuts the text to roughly half its length.",
    example: "Before: (200 words with padding)\nAfter:  (~100 words, all key ideas intact)"
  },
  "Dialogue to Prose": {
    description: "Converts a dialogue exchange to close third-person prose.",
    example: "Before: \"\\\"You're late.\\\" \\\"I know.\\\"\"\nAfter:  \"She looked up when he came in. He didn't apologise.\""
  },
  "Prose to Dialogue": {
    description: "Rewrites a prose passage as dialogue between two characters.",
    example: "Before: \"He told her he was leaving.\"\nAfter:  \"\\\"I'm leaving.\\\" She kept her eyes on the window.\""
  }
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function calcDropdownTop(
  lineRect: DOMRect,
  editorRect: DOMRect,
  estimatedHeight: number,
  scrollTop: number = 0
): string {
  const GAP = 8;

  // Ideal position: just below the anchor line, accounting for scroll offset.
  // lineRect.bottom - editorRect.top gives the viewport-relative offset;
  // adding scrollTop converts it into the absolute position within the scrolled container.
  const idealTop    = lineRect.bottom - editorRect.top + GAP + scrollTop;
  const idealBottom = idealTop + estimatedHeight;

  // How far the dropdown bleeds past the visible editor bottom
  const overflow = idealBottom - (editorRect.height + scrollTop);

  if (overflow <= 0) {
    return `${idealTop}px`;
  }

  const clampedTop = idealTop - overflow;

  // Floor: never go above the bottom of the anchor line itself
  const floor = lineRect.bottom - editorRect.top + GAP + scrollTop;

  return `${Math.max(clampedTop, floor)}px`;
}

function extractTaggedVariants(raw: string, count: number): string[] {
  // Pass 1: strict [V1]...[/V1] matching
  const strict: string[] = [];
  for (let i = 1; i <= count; i++) {
    const rx = new RegExp(`\\[V${i}\\]([\\s\\S]*?)\\[/V${i}\\]`, "i");
    const m  = raw.match(rx);
    if (m) {
      const cleaned = m[1]
        .replace(/\[V\d+\]/gi, "")
        .replace(/\[\/V\d+\]/gi, "")
        .trim();
      if (cleaned.length > 0) strict.push(cleaned);
    }
  }
  if (strict.length > 0) return strict;

  // Pass 2: model used [V1] as both opener and closer (no slash)
  // Split the raw text on [V1], [V2], … markers and take what's between them
  const splitRx = /\[V\d+\]/gi;
  const parts   = raw.split(splitRx).map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length > 0) return parts.slice(0, count);

  // Pass 3: model ignored tags entirely — return raw as single candidate
  return [raw.trim()];
}

function getPrecedingContext(
  editor: Editor,
  cursorLine: number,
  cursorCh: number,
  maxChars = 800
): string {
  const lines: string[] = [];
  lines.unshift(editor.getLine(cursorLine).slice(0, cursorCh));
  let collected = lines[0].length;
  let ln = cursorLine - 1;
  while (ln >= 0 && collected < maxChars) {
    const l = editor.getLine(ln);
    lines.unshift(l);
    collected += l.length + 1;
    ln--;
  }
  return lines.join("\n").slice(-maxChars).trim();
}

function isFragment(text: string): boolean {
  const t = text.trimEnd();
  if (t.length === 0) return false;
  return !TERMINAL_PUNCT.test(t[t.length - 1]);
}

function hasAlphanumeric(text: string): boolean {
  return /[a-zA-Z0-9]/.test(text);
}

function truncateWords(text: string, maxWords: number): [string, boolean] {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text, false];
  return [words.slice(0, maxWords).join(" "), true];
}

function sentenceLimitClause(
  max: number,
  context: "normal" | "variations" | "predict" | "finish"
): string {
  if (max <= 0) return "";
  const noun = max === 1 ? "sentence" : "sentences";
  switch (context) {
    case "variations": return `Each variation must be no longer than ${max} ${noun}. `;
    case "predict":    return `Each predicted sentence must be no more than ${max} ${noun}. `;
    case "finish":     return `The completion must be no longer than ${max} ${noun}. `;
    default:           return `Your entire response must be no more than ${max} ${noun}. `;
  }
}

function snapSelectionBoundaries(
  editor: Editor,
  startPos: { line: number; ch: number },
  endPos: { line: number; ch: number },
  _selectedText: string
): {
  start: { line: number; ch: number };
  end:   { line: number; ch: number };
  text:  string;
  wasSnapped: boolean;
} {
  let { line: sl, ch: sc } = startPos;
  let { line: el, ch: ec } = endPos;
  let wasSnapped = false;

  const startLine = editor.getLine(sl);
  const endLine   = editor.getLine(el);

  // END snaps
  if (ec < endLine.length && /\w/.test(endLine[ec]) && /\w/.test(endLine[ec - 1] ?? "")) {
    while (ec < endLine.length && /\w/.test(endLine[ec])) ec++;
    wasSnapped = true;
  }
  {
    let probe = ec;
    if (probe < endLine.length && endLine[probe] === " ") probe++;
    if (
      probe < endLine.length &&
      TERMINAL_PUNCT.test(endLine[probe]) &&
      probe - ec <= SNAP_LOOKAHEAD
    ) {
      ec = probe + 1;
      wasSnapped = true;
      if (ec < endLine.length && CLOSING_QUOTES.test(endLine[ec])) {
        ec++;
        wasSnapped = true;
      }
    }
  }

  // START snaps
  if (sc > 0 && /\w/.test(startLine[sc] ?? "") && /\w/.test(startLine[sc - 1] ?? "")) {
    while (sc > 0 && /\w/.test(startLine[sc - 1] ?? "")) sc--;
    wasSnapped = true;
  }
  if (sc > 0 && OPENING_QUOTES.test(startLine[sc - 1] ?? "")) {
    sc--;
    wasSnapped = true;
  }

  let text: string;
  if (sl === el) {
    text = endLine.slice(sc, ec);
  } else {
    const firstPart  = startLine.slice(sc);
    const lastPart   = endLine.slice(0, ec);
    const midLines: string[] = [];
    for (let ln = sl + 1; ln < el; ln++) midLines.push(editor.getLine(ln));
    text = [firstPart, ...midLines, lastPart].join("\n");
  }

  return { start: { line: sl, ch: sc }, end: { line: el, ch: ec }, text, wasSnapped };
}

// ─────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────

export default class OllamaTextProcessorPlugin extends Plugin {
  settings!: OllamaSettings;
  private activeDropdown: HTMLElement | null = null;

  async onload(): Promise<void> {
  console.log("[OllamaPlugin] onload()");
  await this.loadSettings();
  this.addSettingTab(new OllamaSettingTab(this.app, this));

  // ── Context-menu registration (existing) ──────────────────────────────
      this.registerEvent(
      (this.app.workspace as any).on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
        this.buildMenuItem(menu, editor);
      })
    );

  // ── Hotkey command (ADD THIS BLOCK) ───────────────────────────────────
  this.addCommand({
    id: "ollama-run-at-cursor",
    name: "Run AI at cursor (uses saved prompt settings)",
    editorCallback: (editor: Editor) => {
      this.runAtCursor(editor);
    }
  });
}

private async runAtCursor(editor: Editor): Promise<void> {
  // ── 1. Resolve target text using the same logic as buildMenuItem ──────
  let targetText       = "";
  let captureMode: CaptureMode = "sentence";
  let rangeStart       = { line: 0, ch: 0 };
  let rangeEnd         = { line: 0, ch: 0 };
  let paragraphContext = "";

  const rawSelection = editor.getSelection();

  if (rawSelection && rawSelection.trim().length > 0) {
    if (!hasAlphanumeric(rawSelection)) return;
    const from    = editor.getCursor("from");
    const to      = editor.getCursor("to");
    const snapped = snapSelectionBoundaries(editor, from, to, rawSelection);
    rangeStart       = snapped.start;
    rangeEnd         = snapped.end;
    targetText       = snapped.text;
    captureMode      = isFragment(targetText) ? "finish-fragment" : "selection";
    paragraphContext  = getPrecedingContext(editor, rangeStart.line, rangeStart.ch);

  } else {
    const cursor     = editor.getCursor();
    const lineText   = editor.getLine(cursor.line);
    const sentenceRx = /[^.!?…]+[.!?…]*\s*/g;
    let match: RegExpExecArray | null;
    let foundSentence = false;

    while ((match = sentenceRx.exec(lineText)) !== null) {
      const start = match.index;
      const end   = start + match[0].length;
      if (start <= cursor.ch && cursor.ch < end) {
        targetText    = match[0].trim();
        rangeStart    = { line: cursor.line, ch: start };
        rangeEnd      = { line: cursor.line, ch: end };
        foundSentence = true;
        captureMode   = isFragment(targetText) ? "finish-fragment" : "sentence";
        if (captureMode === "finish-fragment") {
          paragraphContext = getPrecedingContext(editor, cursor.line, start);
        }
        break;
      }
    }

    if (!foundSentence) {
                if (lineText.trim().length > 0) {
          // Find the last terminal punctuation on the line and take only what follows it
          const lastPunctMatch = lineText.match(/[.!?]['"'"]?\s+/g);
          const lastPunctIdx = lastPunctMatch
            ? lineText.lastIndexOf(lastPunctMatch[lastPunctMatch.length - 1])
              + lastPunctMatch[lastPunctMatch.length - 1].length
            : 0;
          const fragment = lineText.slice(lastPunctIdx).trim();
          const fragmentStart = lastPunctIdx + (lineText.slice(lastPunctIdx).length - lineText.slice(lastPunctIdx).trimStart().length);

          targetText = fragment.length > 0 ? fragment : lineText.trim();
          const effectiveStart = fragment.length > 0 ? fragmentStart : (lineText.length - lineText.trimStart().length);

          if (isFragment(targetText)) {
            captureMode      = "finish-fragment";
            rangeStart       = { line: cursor.line, ch: effectiveStart };
            rangeEnd         = { line: cursor.line, ch: lineText.length };
            paragraphContext  = getPrecedingContext(editor, cursor.line, effectiveStart);
          } else {
            captureMode      = "predict-next";
            rangeStart       = { line: cursor.line, ch: lineText.length };
            rangeEnd         = { line: cursor.line, ch: lineText.length };
            paragraphContext  = getPrecedingContext(editor, cursor.line, lineText.length);
          }
      } else {
        let prevLine = cursor.line - 1;
        while (prevLine > 0 && editor.getLine(prevLine).trim() === "") prevLine--;
        const prevText = editor.getLine(prevLine);
        if (prevLine >= 0 && prevText.trim().length > 0) {
          captureMode      = "predict-next";
          targetText       = prevText.trim();
          rangeStart       = { line: cursor.line, ch: 0 };
          rangeEnd         = { line: cursor.line, ch: 0 };
          paragraphContext  = getPrecedingContext(editor, prevLine, prevText.length);
        }
      }
    }
  }

  if (!targetText || targetText.trim().length === 0) {
    new Notice("No text found at cursor. (N0)");
    return;
  }

  let truncated = false;
  if (captureMode !== "predict-next" && captureMode !== "finish-fragment") {
    [targetText, truncated] = truncateWords(targetText, MAX_INPUT_WORDS);
  }

  // ── 2. Predict / Finish always auto-run (no modal needed) ─────────────
  if (captureMode === "predict-next" || captureMode === "finish-fragment") {
    await this.handleMenuClick(
      editor, targetText, captureMode,
      rangeStart, rangeEnd, paragraphContext, truncated
    );
    return;
  }

  // ── 3. Normal processing: check if any prompts are configured ─────────
  const savedStates  = this.settings.promptStates ?? {};
  const hasAnyActive = Object.values(savedStates).some(
    (s) => s === "single" || s === "combined"
  );

  if (!hasAnyActive) {
    // First time or all cleared — open the modal so user can configure
    new Notice("No prompts configured yet. Opening prompt menu… (SETUP)");
    await this.handleMenuClick(
      editor, targetText, captureMode,
      rangeStart, rangeEnd, paragraphContext, truncated
    );
    return;
  }

  // ── 4. Auto-run with saved prompt states, skip the modal ──────────────
  const prompts: PromptEntry[] = this.settings.customPrompts
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((l) => {
      const idx = l.indexOf("|");
      return { name: l.slice(0, idx).trim(), template: l.slice(idx + 1).trim() };
    });

  const individual: PromptEntry[] = [];
  const combined:   PromptEntry[] = [];
  prompts.forEach((p) => {
    const state = savedStates[p.name] ?? "off";
    if      (state === "single")   individual.push(p);
    else if (state === "combined") combined.push(p);
  });

  if (individual.length === 0 && combined.length === 0) {
    new Notice("No prompts configured yet. Opening prompt menu… (SETUP)");
    await this.handleMenuClick(
      editor, targetText, captureMode,
      rangeStart, rangeEnd, paragraphContext, truncated
    );
    return;
  }

  if (truncated) {
    new Notice(
      `⚠ Input capped at ${MAX_INPUT_WORDS} words.`,
      6000
    );
  }

  const maxSent    = this.settings.maxOutputSentences;
  const taskCount  = individual.length + (combined.length > 0 ? 1 : 0);
  const dismissSpinner = this.showLoadingSpinner(
    editor, rangeStart,
    this.settings.variationsMode
      ? `Running ${taskCount} task(s), ${this.settings.variationsCount} variants each…`
      : `Running ${taskCount} AI task(s)…`
  );

  const candidates: OutputCandidate[] = [];

  try {
    for (const p of individual) {
      const limitClause = sentenceLimitClause(maxSent, "normal");
      const basePrompt  = p.template.includes("[]")
        ? p.template.replace(/\[\]/g, targetText)
        : p.template + "\n\n" + targetText;
      const finalPrompt = limitClause
        ? basePrompt.replace(/(Return ONLY[^:]*:)/i, `$1 ${limitClause.trim()}`)
        : basePrompt;

      try {
        if (this.settings.variationsMode) {
          const variants = await this.getOllamaVariations(
            p.template.includes("[]")
              ? p.template.replace(/\[\]/g, targetText)
              : p.template + "\n\n" + targetText,
            this.settings.variationsCount,
            maxSent
          );
          variants.forEach((v, i) =>
            candidates.push({ text: v, sourceNames: [`${p.name} — variant ${i + 1}`] })
          );
        } else {
          const result = await this.getOllamaResponse(finalPrompt);
          candidates.push({ text: result, sourceNames: [p.name] });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        new Notice(`Ollama Error (E_TASK): ${msg} for "${p.name}"`);
      }
    }

    if (combined.length > 0) {
      const actions = combined.map((p) =>
        p.template
          .replace(/\[\]/g, "")
          .replace(/return only.*$/i, "")
          .replace(/\s{2,}/g, " ")
          .trim()
          .replace(/[.:]$/, "")
          .toLowerCase()
      );

      const fusedInstruction = actions.length === 1
        ? `Take the following text and ${actions[0]}.`
        : `Take the following text and ${actions.slice(0, -1).join(", ")}, and ${actions[actions.length - 1]}.`;

      const limitClause    = sentenceLimitClause(maxSent, "normal");
      const combinedPrompt =
        fusedInstruction +
        " Apply all changes at once and return ONLY the final result." +
        (limitClause ? " " + limitClause.trim() : "") +
        " Do not explain, do not list steps, do not number outputs." +
        " Output exactly one block of text.\n\nText:\n" + targetText;

      try {
        if (this.settings.variationsMode) {
          const variants = await this.getOllamaVariations(
            fusedInstruction +
            " Apply all changes at once. Do not explain, do not list steps." +
            "\n\nText:\n" + targetText,
            this.settings.variationsCount,
            maxSent
          );
          variants.forEach((v, i) =>
            candidates.push({
              text: v,
              sourceNames: [...combined.map((p) => p.name), `variant ${i + 1}`]
            })
          );
        } else {
          const result = await this.getOllamaResponse(combinedPrompt);
          candidates.push({ text: result, sourceNames: combined.map((p) => p.name) });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        new Notice(`Ollama Error (E_COMBINED): ${msg}`);
      }
    }

  } finally {
    dismissSpinner();
  }

  if (candidates.length === 0) {
    new Notice("All AI calls failed. Nothing to choose from. (E_ALL)");
    return;
  }

  this.showInlineSuggestions(editor, rangeStart, rangeEnd, targetText, candidates, captureMode);
}
  // ── Menu item construction ──────────────────────────────────────────────

  private buildMenuItem(menu: Menu, editor: Editor): void {
    let targetText       = "";
    let captureMode: CaptureMode = "sentence";
    let rangeStart       = { line: 0, ch: 0 };
    let rangeEnd         = { line: 0, ch: 0 };
    let paragraphContext = "";

    const rawSelection = editor.getSelection();

    if (rawSelection && rawSelection.trim().length > 0) {
      if (!hasAlphanumeric(rawSelection)) return;

      const from    = editor.getCursor("from");
      const to      = editor.getCursor("to");
      const snapped = snapSelectionBoundaries(editor, from, to, rawSelection);

      rangeStart       = snapped.start;
      rangeEnd         = snapped.end;
      targetText       = snapped.text;
      captureMode      = isFragment(targetText) ? "finish-fragment" : "selection";
      paragraphContext  = getPrecedingContext(editor, rangeStart.line, rangeStart.ch);

    } else {
      // ── No selection: detect sentence under cursor ──────────────────────
      const cursor     = editor.getCursor();
      const lineText   = editor.getLine(cursor.line);

      // Build regex fresh each time to avoid sticky lastIndex between openings
      const sentenceRx = /[^.!?…]+[.!?…]*\s*/g;
      let match: RegExpExecArray | null;
      let foundSentence = false;

      while ((match = sentenceRx.exec(lineText)) !== null) {
        const start = match.index;
        const end   = start + match[0].length;
        // Use < (not <=) so cursor at the exact end of a sentence
        // doesn't bleed into the next one
        if (start <= cursor.ch && cursor.ch < end) {
          targetText    = match[0].trim();
          rangeStart    = { line: cursor.line, ch: start };
          rangeEnd      = { line: cursor.line, ch: end };
          foundSentence = true;
          captureMode   = isFragment(targetText) ? "finish-fragment" : "sentence";
          if (captureMode === "finish-fragment") {
            paragraphContext = getPrecedingContext(editor, cursor.line, start);
          }
          break;
        }
      }

      if (!foundSentence) {
        // Cursor is past the last punctuation on the line, or on a blank line
                if (lineText.trim().length > 0) {
          // Find the last terminal punctuation on the line and take only what follows it
          const lastPunctMatch = lineText.match(/[.!?]['"'"]?\s+/g);
          const lastPunctIdx = lastPunctMatch
            ? lineText.lastIndexOf(lastPunctMatch[lastPunctMatch.length - 1])
              + lastPunctMatch[lastPunctMatch.length - 1].length
            : 0;
          const fragment = lineText.slice(lastPunctIdx).trim();
          const fragmentStart = lastPunctIdx + (lineText.slice(lastPunctIdx).length - lineText.slice(lastPunctIdx).trimStart().length);

          targetText = fragment.length > 0 ? fragment : lineText.trim();
          const effectiveStart = fragment.length > 0 ? fragmentStart : (lineText.length - lineText.trimStart().length);

          if (isFragment(targetText)) {
            captureMode      = "finish-fragment";
            rangeStart       = { line: cursor.line, ch: effectiveStart };
            rangeEnd         = { line: cursor.line, ch: lineText.length };
            paragraphContext  = getPrecedingContext(editor, cursor.line, effectiveStart);
          } else {
            captureMode      = "predict-next";
            rangeStart       = { line: cursor.line, ch: lineText.length };
            rangeEnd         = { line: cursor.line, ch: lineText.length };
            paragraphContext  = getPrecedingContext(editor, cursor.line, lineText.length);
          }
        } else {
          // Blank line: walk back to find last non-empty line
          let prevLine = cursor.line - 1;
          while (prevLine > 0 && editor.getLine(prevLine).trim() === "") prevLine--;
          const prevText = editor.getLine(prevLine);
          if (prevLine >= 0 && prevText.trim().length > 0) {
            captureMode      = "predict-next";
            targetText       = prevText.trim();
            rangeStart       = { line: cursor.line, ch: 0 };
            rangeEnd         = { line: cursor.line, ch: 0 };
            paragraphContext  = getPrecedingContext(editor, prevLine, prevText.length);
          }
        }
      }
    }

    if (!targetText || targetText.trim().length === 0) return;

    let truncated = false;
    if (captureMode !== "predict-next" && captureMode !== "finish-fragment") {
      [targetText, truncated] = truncateWords(targetText, MAX_INPUT_WORDS);
    }

    const capText      = targetText;
    const capMode      = captureMode;
    const capStart     = { ...rangeStart };
    const capEnd       = { ...rangeEnd };
    const capContext   = paragraphContext;
    const capTruncated = truncated;

    const menuTitle =
      capMode === "predict-next"    ? "AI: Predict Next Sentence..." :
      capMode === "finish-fragment" ? "AI: Finish Sentence..."       :
                                     "AI: Process Text...";

    menu.addItem((item: MenuItem) => {
      item
        .setTitle(menuTitle)
        .setIcon("bot-message-square")
        .onClick(() => this.handleMenuClick(editor, capText, capMode, capStart, capEnd, capContext, capTruncated, true));
    });
  }

  // ── Menu click handler ──────────────────────────────────────────────────

  private async handleMenuClick(
    editor: Editor,
    capText: string,
    capMode: CaptureMode,
    capStart: { line: number; ch: number },
    capEnd:   { line: number; ch: number },
    capContext: string,
    capTruncated: boolean,
    showModal = false
  ): Promise<void> {

    if (capTruncated) {
      new Notice(
        `⚠ Input capped at ${MAX_INPUT_WORDS} words. Only the first ${MAX_INPUT_WORDS} words were sent.`,
        6000
      );
    }

    const maxSent = this.settings.maxOutputSentences;

    // Predict / Finish — auto-run unless triggered from menu (showModal = true)
    if ((capMode === "predict-next" || capMode === "finish-fragment") && !showModal) {
      const count = this.settings.variationsMode
        ? this.settings.variationsCount
        : DEFAULT_PREDICT_COUNT;

      const dismissSpinner = this.showLoadingSpinner(
        editor, capStart,
        capMode === "predict-next"
          ? `Predicting sentence…`
          : `Generating ${count} completions…`
      );

      try {
        let prompt: string;

        if (capMode === "predict-next") {
          const limitClause = sentenceLimitClause(maxSent, "predict");
          prompt =
            `You are a writing assistant. Below is a passage of text.\n` +
            `Predict the next sentence that would naturally follow.\n` +
            `Produce exactly ${count} different possible next sentences.\n` +
            (limitClause ? `${limitClause}\n` : "") +
            `Each should continue the passage naturally but offer a different direction, detail, or tone.\n` +
            `Wrap each option in tags:\n` +
            `[V1]first sentence here[/V1]\n[V2]second sentence here[/V2]\n` +
            `...and so on up to [V${count}].\n` +
            `Output ONLY the tagged sentences. No explanation. No text outside the tags.\n\n` +
            `Passage:\n${capContext}`;
        } else {
          const limitClause = sentenceLimitClause(maxSent, "finish");
          prompt =
            `You are a writing assistant. Complete the unfinished sentence fragment below into a full, natural sentence.\n\n` +
            `Rules:\n` +
            `- Output the COMPLETE sentence from start to finish.\n` +
            `- The sentence MUST begin with the exact characters of the fragment, unchanged.\n` +
            `- Do NOT alter, rephrase, or skip any part of the fragment.\n` +
            `- Simply continue the fragment naturally until the sentence is complete.\n\n` +
            `Examples:\n` +
            `- Fragment: "His savings wer" → output: "His savings were dwindling fast."\n` +
            `- Fragment: "I want to " → output: "I want to break free."\n` +
            `- Fragment: "She wal" → output: "She walked into the room."\n\n` +
            `Produce exactly ${count} different completed sentences.\n` +
            (limitClause ? `${limitClause}\n` : "") +
            `Wrap each in tags:\n` +
            `[V1]full sentence here[/V1]\n[V2]full sentence here[/V2]\n` +
            `...and so on up to [V${count}].\n` +
            `Output ONLY the tagged sentences. No explanation. No text outside the tags.\n\n` +
            `Fragment: "${capText}"\n\n` +
            `Preceding context:\n${capContext}`;
        }

        const raw      = await this.callOllama(prompt);
        const variants = extractTaggedVariants(raw, count);

        const ensureTerminated = (t: string): string => {
          const s = t.trim();
          if (s.length === 0) return s;
          const last = s[s.length - 1];
          return /[.!?]/.test(last) ? s : s + ".";
        };

        const candidates: OutputCandidate[] = variants.length > 0
          ? variants.map((v, i) => ({
              text: ensureTerminated(v),
              sourceNames: [capMode === "predict-next" ? `${i + 1}` : `Completion ${i + 1}`],
            }))
          : [{
              text: ensureTerminated(raw),
              sourceNames: ["AI suggestion"],
            }];

            this.showInlineSuggestions(editor, capStart, capEnd, capText, candidates, capMode);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        new Notice(`Ollama Error (E_PREDICT): ${msg}`);
      } finally {
        dismissSpinner();
      }

      return;
    }

    // ── Normal processing ─────────────────────────────────────────────────
    const prompts: PromptEntry[] = this.settings.customPrompts
      .split("\n")
      .filter((l) => l.includes("|"))
      .map((l) => {
        const idx = l.indexOf("|");
        return { name: l.slice(0, idx).trim(), template: l.slice(idx + 1).trim() };
      });

    new PromptSelectionModal(
      this.app,
      prompts,
      capText,
      this.settings.promptStates,
      this.settings.maxOutputSentences,
      async (selection, newStates, newMaxSent) => {
        this.settings.promptStates       = newStates;
        this.settings.maxOutputSentences = newMaxSent;
        await this.saveSettings();

        const { individual, combined } = selection;

        if (individual.length === 0 && combined.length === 0) {
          new Notice("No prompts selected. Action cancelled. (N0)");
          return;
        }

        const taskCount = individual.length + (combined.length > 0 ? 1 : 0);
        const dismissSpinner = this.showLoadingSpinner(
          editor, capStart,
          this.settings.variationsMode
            ? `Running ${taskCount} task(s), ${this.settings.variationsCount} variants each…`
            : `Running ${taskCount} AI task(s)…`
        );

        const candidates: OutputCandidate[] = [];

        try {
          for (const p of individual) {
            const limitClause  = sentenceLimitClause(newMaxSent, "normal");
            const basePrompt   = p.template.includes("[]")
              ? p.template.replace(/\[\]/g, capText)
              : p.template + "\n\n" + capText;
            const finalPrompt  = limitClause
              ? basePrompt.replace(/(Return ONLY[^:]*:)/i, `$1 ${limitClause.trim()}`)
              : basePrompt;

            try {
              if (this.settings.variationsMode) {
                const variants = await this.getOllamaVariations(
                  p.template.includes("[]")
                    ? p.template.replace(/\[\]/g, capText)
                    : p.template + "\n\n" + capText,
                  this.settings.variationsCount,
                  newMaxSent
                );
                variants.forEach((v, i) =>
                  candidates.push({ text: v, sourceNames: [`${p.name} — variant ${i + 1}`] })
                );
              } else {
                const result = await this.getOllamaResponse(finalPrompt);
                candidates.push({ text: result, sourceNames: [p.name] });
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              new Notice(`Ollama Error (E_TASK): ${msg} for "${p.name}"`);
            }
          }

          if (combined.length > 0) {
            const actions = combined.map((p) =>
              p.template
                .replace(/\[\]/g, "")
                .replace(/return only.*$/i, "")
                .replace(/\s{2,}/g, " ")
                .trim()
                .replace(/[.:]$/, "")
                .toLowerCase()
            );

            const fusedInstruction = actions.length === 1
              ? `Take the following text and ${actions[0]}.`
              : `Take the following text and ${actions.slice(0, -1).join(", ")}, and ${actions[actions.length - 1]}.`;

            const limitClause    = sentenceLimitClause(newMaxSent, "normal");
            const combinedPrompt =
              fusedInstruction +
              " Apply all changes at once and return ONLY the final result." +
              (limitClause ? " " + limitClause.trim() : "") +
              " Do not explain, do not list steps, do not number outputs." +
              " Output exactly one block of text.\n\nText:\n" + capText;

            try {
              if (this.settings.variationsMode) {
                const variants = await this.getOllamaVariations(
                  fusedInstruction +
                  " Apply all changes at once." +
                  " Do not explain, do not list steps." +
                  "\n\nText:\n" + capText,
                  this.settings.variationsCount,
                  newMaxSent
                );
                variants.forEach((v, i) =>
                  candidates.push({
                    text: v,
                    sourceNames: [...combined.map((p) => p.name), `variant ${i + 1}`]
                  })
                );
              } else {
                const result = await this.getOllamaResponse(combinedPrompt);
                candidates.push({ text: result, sourceNames: combined.map((p) => p.name) });
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              new Notice(`Ollama Error (E_COMBINED): ${msg}`);
            }
          }

        } finally {
          dismissSpinner();
        }

        if (candidates.length === 0) {
          new Notice("All AI calls failed. Nothing to choose from. (E_ALL)");
          return;
        }

        this.showInlineSuggestions(editor, capStart, capEnd, capText, candidates, capMode)
      }
    ).open();
  }

  // ── Ollama API ──────────────────────────────────────────────────────────

  async getOllamaResponse(promptText: string): Promise<string> {
    return this.callOllama(promptText);
  }

  async getOllamaVariations(
    promptText: string,
    count: number,
    maxSentences = 0
  ): Promise<string[]> {
    const tagList     = Array.from({ length: count }, (_, i) => `[V${i + 1}]...[/V${i + 1}]`).join(", ");
    const limitClause = sentenceLimitClause(maxSentences, "variations");

    const variationPrompt =
      `Produce exactly ${count} different variations of the following editing task.\n` +
      `Each variation applies the same instruction but with different word choices,\n` +
      `sentence structures, or stylistic approaches.\n` +
      (limitClause ? `${limitClause}\n` : "") +
      `Wrap each variation in these exact tags: ${tagList}.\n` +
      `Output ONLY the tagged variations. No text outside the tags. No explanation.\n\n` +
      promptText;

    const raw      = await this.callOllama(variationPrompt);
    const variants = extractTaggedVariants(raw, count);
    if (variants.length === 0) {
      console.warn("[OllamaPlugin] Variation tag parsing failed, using raw response.", { raw });
      return [raw.trim()];
    }
    return variants;
  }

  async callOllama(promptText: string): Promise<string> {
    const url  = this.settings.ollamaUrl.replace(/\/$/, "") + "/api/generate";
    const body = {
      model:  this.settings.ollamaModel,
      prompt: promptText,
      system:
        "You are a precise text editing and writing assistant. " +
        "Follow instructions exactly. Return ONLY what is asked. " +
        "Never explain, summarise, or add commentary. " +
        "Never output any text outside of tag structures you are asked to use. " +
        "Respect all sentence count limits you are given.",
      stream: false
    };

    const fetchPromise = requestUrl({
      url,
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body)
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Ollama request timed out after ${OLLAMA_TIMEOUT_MS / 1000}s`)),
        OLLAMA_TIMEOUT_MS
      )
    );

    const res = await Promise.race([fetchPromise, timeoutPromise]);

    if (res.status !== 200) {
      new Notice(`Ollama HTTP error (E_HTTP): ${res.status}`);
      throw new Error(`HTTP ${res.status}`);
    }

    let json: OllamaGenerateResponse;
    try {
      json = res.json as OllamaGenerateResponse;
    } catch (e) {
      new Notice("Ollama JSON parse error (E_JSON)");
      throw e;
    }

    if (!json || typeof json.response !== "string") {
      new Notice("Ollama response missing 'response' field (E_JSON).");
      throw new Error("Missing 'response' field in Ollama output");
    }

    return json.response.trim();
  }
  
  private debugMode = false; // set to false to disable debug logging
  private logDump: string[] = [];

  private dumpLog(msg: string): void {
    if (!this.debugMode) return;
    const line = `${new Date().toISOString()} ${msg}`;
    console.log(line);
    this.logDump.push(line);
  }

  private async flushLogDump(): Promise<void> {
    if (!this.debugMode) return;
    if (this.logDump.length === 0) return;
    const content = this.logDump.join("\n");
    this.logDump = [];
    const path = "ollama-debug.md";
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing) {
      await this.app.vault.modify(existing as import("obsidian").TFile, content);
    } else {
      await this.app.vault.create(path, content);
    }
    new Notice("Debug log written to ollama-debug.md");
  }
  // ── Loading spinner ─────────────────────────────────────────────────────

    showLoadingSpinner(
    editor: Editor,
    anchorLine: { line: number; ch: number },
    label = "Thinking…"
  ): () => void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return () => {};

    const cmEditor = view.contentEl.querySelector(".cm-editor") as HTMLElement | null;
    if (!cmEditor) return () => {};

    const lines  = cmEditor.querySelectorAll(".cm-line");
    const lineEl = lines[Math.min(anchorLine.line, lines.length - 1)] as HTMLElement | null;
    if (!lineEl) return () => {};

    const lineRect = lineEl.getBoundingClientRect();

    this.dumpLog(`[OllamaSpinner] anchorLine.line: ${anchorLine.line}`);
    this.dumpLog(`[OllamaSpinner] lineRect: ${JSON.stringify({ top: lineRect.top, bottom: lineRect.bottom, left: lineRect.left })}`);
    void this.flushLogDump();

    const spinnerStyle = document.createElement("style");
    spinnerStyle.textContent = `
      @keyframes ollama-spin { to { transform: rotate(360deg); } }
      .ollama-spinner-ring {
        width:14px; height:14px; flex-shrink:0;
        border:2px solid var(--background-modifier-border);
        border-top-color:var(--text-accent,#7c5cfc);
        border-radius:50%;
        animation:ollama-spin 0.7s linear infinite;
      }
    `;
    document.head.appendChild(spinnerStyle);

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;
      left:${lineRect.left}px;
      top:${lineRect.bottom + 16}px;
      display:flex; align-items:center; gap:0.5em;
      padding:0.35em 0.75em;
      background:rgba(255,255,255,0.93);
      border:1px solid var(--background-modifier-border);
      border-radius:4px;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      font-size:0.82em; color:var(--text-muted);
      z-index:9999; cursor:move; user-select:none; white-space:nowrap;
    `;

    const ring    = document.createElement("div");
    ring.className = "ollama-spinner-ring";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    overlay.appendChild(ring);
    overlay.appendChild(labelEl);

    let dragging = false, dx = 0, dy = 0, ox = 0, oy = 0;
    overlay.addEventListener("mousedown", (e: MouseEvent) => {
      dragging = true; dx = e.clientX; dy = e.clientY;
      ox = overlay.offsetLeft; oy = overlay.offsetTop;
      e.preventDefault();
    });
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      overlay.style.left = `${ox + e.clientX - dx}px`;
      overlay.style.top  = `${oy + e.clientY - dy}px`;
    };
    const onUp = () => { dragging = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.appendChild(overlay);

    return () => {
      overlay.remove();
      spinnerStyle.remove();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }

  // ── Inline suggestions dropdown ─────────────────────────────────────────

    private showInlineSuggestions(
    editor: Editor,
    start: { line: number; ch: number },
    end:   { line: number; ch: number },
    _originalText: string,
    candidates: OutputCandidate[],
    capMode: CaptureMode = "sentence"
  ): void {
    // For predict-next there is no original text — insertion goes into empty space
    // For all other modes use the passed-in originalText (the fragment/selection being replaced)
    _originalText = capMode === "predict-next" ? "" : _originalText;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      this.dumpLog(`[OllamaDropdown] FALLBACK: no view`);
      void this.flushLogDump();
      editor.replaceRange(candidates[0].text, start, end);
      new Notice("Applied first AI output (no view). (FALLBACK)");
      return;
    }

    const cmEditor = view.contentEl.querySelector(".cm-editor") as HTMLElement | null;
    if (!cmEditor) {
      this.dumpLog(`[OllamaDropdown] FALLBACK: no cmEditor`);
      void this.flushLogDump();
      editor.replaceRange(candidates[0].text, start, end);
      new Notice("Applied first AI output (no editor). (FALLBACK)");
      return;
    }

    const lines = cmEditor.querySelectorAll(".cm-line");
    if (start.line < 0 || start.line >= lines.length) {
      this.dumpLog(`[OllamaDropdown] FALLBACK: line out of range, start.line: ${start.line} lines.length: ${lines.length}`);
      void this.flushLogDump();
      editor.replaceRange(candidates[0].text, start, end);
      new Notice("Applied first AI output (line out of range). (FALLBACK)");
      return;
    }

    const lineEl   = lines[start.line] as HTMLElement;
    const lineRect = lineEl.getBoundingClientRect();

    // Find the longest candidate and compute where its insertion ends,
    // then use that line's bottom as the dropdown anchor
        // Position dropdown below the longest candidate — computed after calcInsertion/calcEndAfterInsertion are defined below
    // Use inline calculation here since functions aren't defined yet at this point
    const calcInsertion = (text: string): string => {
      if (_originalText !== "" && text.toLowerCase().startsWith(_originalText.toLowerCase().trimEnd())) {
        return text;
      }
      const lineText   = editor.getLine(start.line);
      const charBefore = start.ch > 0 ? lineText[start.ch - 1] : "";
      const firstChar  = text[0] ?? "";
      const midWord    = /[a-zA-Z0-9]/.test(charBefore);
      if (midWord && firstChar === " ")                                                           return text.trimStart();
      if (charBefore === " " && firstChar === " ")                                                return text.trimStart();
      if (!midWord && charBefore !== " " && charBefore !== "" && /[a-zA-Z0-9]/.test(firstChar))  return " " + text;
      return text;
    };

        const calcEndAfterInsertion = (insertionStart: { line: number; ch: number }, insertion: string): { line: number; ch: number } => {
      const insertionLines = insertion.split("\n");
      if (insertionLines.length === 1) {
        return { line: insertionStart.line, ch: insertionStart.ch + insertion.length };
      }
      return { line: insertionStart.line + insertionLines.length - 1, ch: insertionLines[insertionLines.length - 1].length };
    };

    const longestCandidate = candidates.reduce((a, b) => a.text.length > b.text.length ? a : b);
    const longestInsertion = calcInsertion(longestCandidate.text);
    const longestEnd       = calcEndAfterInsertion(start, longestInsertion);
    const anchorLineIndex  = Math.min(longestEnd.line, lines.length - 1);
    const anchorLineEl     = lines[anchorLineIndex] as HTMLElement;
    const anchorRect       = anchorLineEl.getBoundingClientRect();

    this.dumpLog(`[OllamaDropdown] start.line: ${start.line} end.line: ${end.line}`);
    this.dumpLog(`[OllamaDropdown] lineRect: ${JSON.stringify({ top: lineRect.top, bottom: lineRect.bottom, left: lineRect.left })}`);
        this.dumpLog(`OllamaDropdown placing at left=${anchorRect.left} top=${anchorRect.bottom + 8}`);
    void this.flushLogDump();

    const dropdown = document.createElement("div");
    dropdown.className = "ollama-output-dropdown";
    dropdown.style.cssText = `position:fixed; left:${anchorRect.left}px; top:${anchorRect.bottom + 64}px;
      min-width:220px; max-width:520px;
      max-height:60vh; overflow-y:auto;
      background:var(--background-primary,rgba(255,255,255,0.96));
      border:1px solid var(--background-modifier-border);
      border-radius:6px;
      box-shadow:0 4px 16px rgba(0,0,0,0.3);
      z-index:9999; font-size:0.85em;
    `;

    this.activeDropdown = dropdown;

    let dragging = false, dx = 0, dy = 0, ox = 0, oy = 0;
    const dragHandle = document.createElement("div");
    dragHandle.textContent = "Outputs";
    dragHandle.style.cssText = `
      font-size:0.8em; padding:0.2em 0.5em; cursor:move; font-weight:600;
      border-bottom:1px solid var(--background-modifier-border);
      color:var(--text-muted); user-select:none;
    `;
    dropdown.appendChild(dragHandle);

    dragHandle.addEventListener("mousedown", (e: MouseEvent) => {
      dragging = true; dx = e.clientX; dy = e.clientY;
      ox = dropdown.offsetLeft; oy = dropdown.offsetTop;
      e.preventDefault();
    });
    const onDragMove = (e: MouseEvent) => {
      if (!dragging) return;
      dropdown.style.left = `${ox + e.clientX - dx}px`;
      dropdown.style.top  = `${oy + e.clientY - dy}px`;
    };
    const onDragEnd = () => { dragging = false; };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);

    const cleanup = () => {
      if (this.activeDropdown === dropdown) this.activeDropdown = null;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
    };

        const apply = (text: string) => {
      // For finish-fragment the model outputs the full sentence — replace start→end directly
      // For all other modes use spacing logic to join the insertion cleanly
      if (_originalText !== "" && text.toLowerCase().startsWith(_originalText.toLowerCase().trimEnd())) {
        editor.replaceRange(text, start, end);
        dropdown.remove();
        cleanup();
        return;
      }

      const line      = editor.getLine(start.line);
      const charBefore = start.ch > 0 ? line[start.ch - 1] : "";
      const firstChar  = text[0] ?? "";
      const midWord     = /[a-zA-Z0-9]/.test(charBefore);
      const startsAlpha = /[a-zA-Z0-9]/.test(firstChar);

      let insertion = text;

      if (midWord && firstChar === " ") {
        insertion = text.trimStart();
      } else if (charBefore === " " && firstChar === " ") {
        insertion = text.trimStart();
      } else if (!midWord && charBefore !== " " && charBefore !== "" && startsAlpha) {
        insertion = " " + text;
      }

      editor.replaceRange(insertion, start, end);
      dropdown.remove();
      cleanup();
    };

        // Track whether a preview is currently active in the document
    let previewActive = false;
    let previewEnd    = { line: end.line, ch: end.ch };
    const originalEnd = { line: end.line, ch: end.ch };

        const previewText = (text: string) => {
      this.dumpLog(`[Preview] previewText called, previewActive: ${previewActive}`);
      this.dumpLog(`[Preview] start: ${JSON.stringify(start)} previewEnd: ${JSON.stringify(previewEnd)} originalEnd: ${JSON.stringify(originalEnd)}`);
      if (previewActive) {
        this.dumpLog(`[Preview] restoring before new preview, replacing start→previewEnd with originalText: "${_originalText}"`);
        editor.replaceRange(_originalText, start, previewEnd);
        previewActive = false;
        previewEnd = { line: originalEnd.line, ch: originalEnd.ch };
        this.dumpLog(`[Preview] restored, previewEnd reset to: ${JSON.stringify(previewEnd)}`);
      }
      const insertion = calcInsertion(text);
      this.dumpLog(`[Preview] inserting: "${insertion}" at start: ${JSON.stringify(start)} replacing up to: ${JSON.stringify(previewEnd)}`);
      editor.replaceRange(insertion, start, previewEnd);
      previewActive = true;
      previewEnd = calcEndAfterInsertion(start, insertion);
      this.dumpLog(`[Preview] inserted, new previewEnd: ${JSON.stringify(previewEnd)}`);
      void this.flushLogDump();
    };

    const restoreOriginal = () => {
      this.dumpLog(`[Preview] restoreOriginal called, previewActive: ${previewActive}`);
      this.dumpLog(`[Preview] start: ${JSON.stringify(start)} previewEnd: ${JSON.stringify(previewEnd)} originalText: "${_originalText}"`);
      if (!previewActive) {
        this.dumpLog(`[Preview] nothing to restore, returning early`);
        return;
      }
      // Log what is ACTUALLY in the document at start→previewEnd right now
      const actualInDoc = editor.getRange(start, previewEnd);
      this.dumpLog(`[Preview] actual text in doc at start→previewEnd: "${actualInDoc}"`);
      this.dumpLog(`[Preview] actualInDoc.length: ${actualInDoc.length}, previewEnd.ch - start.ch: ${previewEnd.ch - start.ch}`);
      editor.replaceRange(_originalText, start, previewEnd);
      previewActive = false;
      previewEnd = { line: originalEnd.line, ch: originalEnd.ch };
      this.dumpLog(`[Preview] replaceRange called, checking doc after restore...`);
      const afterRestore = editor.getRange(start, previewEnd);
      this.dumpLog(`[Preview] text in doc at start→originalEnd after restore: "${afterRestore}"`);
      void this.flushLogDump();
    };

    candidates.forEach((c, index) => {
      const item = document.createElement("div");
      item.style.cssText = "padding:0.3em 0.5em; cursor:pointer; white-space:pre-wrap;";

      const raw   = c.sourceNames ?? [];
      const label =
        raw.length === 0 ? `Option ${index + 1}` :
        raw.length <= 3  ? raw.join(", ")         :
                           `${raw.slice(0, 3).join(", ")}, and ${raw.length - 3} more`;

      const title = document.createElement("div");
      title.textContent   = label;
      title.style.cssText = "font-weight:600; margin-bottom:0.15em; font-size:0.9em; color:var(--text-muted);";

      const body = document.createElement("div");
      body.textContent = c.text;
      body.style.color = "var(--text-normal)";

      item.appendChild(title);
      item.appendChild(body);

      item.addEventListener("mouseenter", () => {
        item.style.backgroundColor = "var(--background-modifier-hover)";
        restoreOriginal();
        previewText(c.text);
      });
      item.addEventListener("mouseleave", () => {
        item.style.backgroundColor = "transparent";
        restoreOriginal();
      });
      item.addEventListener("click", () => {
        // Preview is already inserted — just confirm it by calling apply with current end
        restoreOriginal();
        apply(c.text);
      });

      if (index < candidates.length - 1) {
        const sep = document.createElement("div");
        sep.style.cssText = "border-top:1px solid var(--background-modifier-border); margin:0.2em 0;";
        item.appendChild(sep);
      }

      dropdown.appendChild(item);
    });

    const footerDivider = document.createElement("div");
    footerDivider.style.cssText = "border-top:1px solid var(--background-modifier-border); margin-top:0.2em;";
    dropdown.appendChild(footerDivider);

    const dismissRow = document.createElement("div");
    dismissRow.style.cssText = "display:flex; justify-content:flex-end; padding:0.2em 0.4em;";

    const dismissBtn = document.createElement("div");
    dismissBtn.textContent  = "Dismiss";
    dismissBtn.style.cssText = "cursor:pointer; font-size:0.8em; opacity:0.7; padding:0.1em 0.3em; border-radius:3px;";
    dismissBtn.addEventListener("mouseenter", () => { dismissBtn.style.backgroundColor = "var(--background-modifier-hover)"; });
    dismissBtn.addEventListener("mouseleave", () => { dismissBtn.style.backgroundColor = "transparent"; });
    dismissBtn.addEventListener("click", () => {
      restoreOriginal();
      dropdown.remove();
      cleanup();
      new Notice("Dismissed AI outputs. (C0)");
    });
    dismissRow.appendChild(dismissBtn);
    dropdown.appendChild(dismissRow);

    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        restoreOriginal();
        dropdown.remove();
        cleanup();
        new Notice("Dismissed AI outputs. (ESC)");
      }
    };
    window.addEventListener("keydown", onKey, true);

    document.body.appendChild(dropdown);
  }

  // ── Settings ────────────────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data) as OllamaSettings;
    if (
      !this.settings.promptStates ||
      typeof this.settings.promptStates !== "object" ||
      Array.isArray(this.settings.promptStates)
    ) {
      this.settings.promptStates = {};
    }
    if (typeof this.settings.maxOutputSentences !== "number") {
      this.settings.maxOutputSentences = 0;
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// ─────────────────────────────────────────────
// Prompt Selection Modal
// ─────────────────────────────────────────────

class PromptSelectionModal extends Modal {
  private prompts:      PromptEntry[];
  private targetText:   string;
  private savedStates:  Record<string, "off" | "single" | "combined">;
  private savedMaxSent: number;
  private onSubmit: (
    selection:  PromptSelectionResult,
    newStates:  Record<string, "off" | "single" | "combined">,
    newMaxSent: number
  ) => void;

  constructor(
    app: App,
    prompts: PromptEntry[],
    targetText: string,
    savedStates: Record<string, "off" | "single" | "combined">,
    savedMaxSent: number,
    onSubmit: (
      selection:  PromptSelectionResult,
      newStates:  Record<string, "off" | "single" | "combined">,
      newMaxSent: number
    ) => void
  ) {
    super(app);
    this.prompts      = prompts;
    this.targetText   = targetText;
    this.savedStates  = savedStates;
    this.savedMaxSent = savedMaxSent;
    this.onSubmit     = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Select AI Prompts to Run" });
    contentEl.createEl("p", {
      text: "[ ] Off → [✓] Individual output → [◎] Merge into one combined output. Selections are remembered.",
      cls: "setting-item-description"
    });

    const wordCount = this.targetText.trim().split(/\s+/).filter(Boolean).length;
    const wcEl = contentEl.createEl("p", {
      text: `Input: ${wordCount} word${wordCount !== 1 ? "s" : ""}`,
      cls: "setting-item-description"
    });
    wcEl.style.marginBottom = "0.75em";

    // ── Sentence limit slider ────────────────────────────────────────────
    let currentMaxSent = this.savedMaxSent;

    const limitRow = contentEl.createDiv();
    limitRow.style.cssText = `
      display:flex; align-items:center; gap:0.75em;
      margin-bottom:1em; padding:0.5em 0.25em;
      border-bottom:1px solid var(--background-modifier-border);
    `;

    const limitLabel = limitRow.createEl("span", { text: "Output limit:" });
    limitLabel.style.cssText = "font-size:0.9em; white-space:nowrap; color:var(--text-muted);";

    const slider = limitRow.createEl("input") as HTMLInputElement;
    slider.type  = "range";
    slider.min   = "0";
    slider.max   = "20";
    slider.step  = "1";
    slider.value = String(currentMaxSent);
    slider.style.cssText = "flex:1; cursor:pointer;";
    slider.setAttribute("aria-label", "Maximum output sentences");

    const limitDisplay = limitRow.createEl("span");
    limitDisplay.style.cssText = `
      font-size:0.9em; font-weight:600; min-width:6em; text-align:right;
      color:var(--text-normal); white-space:nowrap;
    `;

    const updateLimitDisplay = (val: number) => {
      limitDisplay.textContent = val === 0 ? "Unlimited" : `Max ${val} sentence${val === 1 ? "" : "s"}`;
    };
    updateLimitDisplay(currentMaxSent);

    slider.addEventListener("input", () => {
      currentMaxSent = parseInt(slider.value, 10);
      updateLimitDisplay(currentMaxSent);
    });

    // ── Prompt rows ──────────────────────────────────────────────────────
    const states: Record<string, "off" | "single" | "combined"> = {};
    this.prompts.forEach((p) => {
      states[p.name] = this.savedStates[p.name] ?? "off";
    });

    const updateFns: (() => void)[] = [];

    this.prompts.forEach((p: PromptEntry) => {
      const wrapper = contentEl.createDiv();
      wrapper.style.marginBottom = "6px";

      const row = wrapper.createDiv();
      row.style.cssText = "display:flex; align-items:center; gap:8px; padding:2px 0;";

      const stateBtn = row.createEl("button") as HTMLButtonElement;
      stateBtn.type = "button";
      stateBtn.style.cssText = `
        width:1.6em; height:1.6em; border-radius:3px; flex-shrink:0;
        border:1px solid var(--background-modifier-border);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; font-size:0.9em; padding:0; background:transparent;
      `;

      const nameSpan = row.createEl("span", { text: p.name });
      nameSpan.style.cssText = "flex:1; cursor:pointer; user-select:none;";

      const infoBtn = row.createEl("button") as HTMLButtonElement;
      infoBtn.type = "button";
      infoBtn.textContent = "ⓘ";
      infoBtn.style.cssText = `
        font-size:0.85em; padding:0 0.3em; cursor:pointer; border:none;
        background:transparent; color:var(--text-muted); border-radius:3px;
        opacity:0.6; flex-shrink:0;
      `;
      infoBtn.setAttribute("aria-label", "Show description");

      const infoPanel = wrapper.createDiv();
      infoPanel.style.cssText = `
        display:none; margin-left:2.4em; padding:0.4em 0.6em;
        font-size:0.82em; color:var(--text-muted);
        background:var(--background-secondary);
        border-left:2px solid var(--background-modifier-border);
        border-radius:0 3px 3px 0; white-space:pre-wrap; line-height:1.5;
      `;

      const info = PROMPT_INFO[p.name];
      infoPanel.textContent = info
        ? `${info.description}\n\n${info.example}`
        : p.template.replace(/\[\]/g, "…").replace(/Return ONLY.*$/i, "").trim();

      let infoVisible = false;
      infoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        infoVisible = !infoVisible;
        infoPanel.style.display = infoVisible ? "block" : "none";
        infoBtn.style.opacity   = infoVisible ? "1"     : "0.6";
        infoBtn.setAttribute("aria-label", infoVisible ? "Hide description" : "Show description");
      });

      const updateState = () => {
        const s = states[p.name];
        stateBtn.textContent = s === "single" ? "✓" : s === "combined" ? "◎" : "";
        stateBtn.style.backgroundColor =
          s === "single"   ? "var(--background-modifier-hover)"        :
          s === "combined" ? "var(--background-modifier-active-hover)" :
                             "transparent";
      };

      stateBtn.addEventListener("click", (evt) => {
        evt.preventDefault();
        const cur = states[p.name];
        states[p.name] = cur === "off" ? "single" : cur === "single" ? "combined" : "off";
        updateState();
      });
      nameSpan.addEventListener("click", () => stateBtn.click());

      updateState();
      updateFns.push(updateState);
    });

    // ── Footer ───────────────────────────────────────────────────────────
    const footer = contentEl.createDiv();
    footer.style.cssText = "margin-top:16px; display:flex; align-items:center; gap:8px;";

    const clearBtn = footer.createEl("button", { text: "Clear all" });
    clearBtn.style.cssText = "margin-right:auto; opacity:0.7;";
    clearBtn.addEventListener("click", () => {
      this.prompts.forEach((p) => { states[p.name] = "off"; });
      updateFns.forEach((fn) => fn());
    });

    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => {
      this.close();
      new Notice("Cancelled. (C0)");
    });

    const runBtn = footer.createEl("button", { text: "Run Selected", cls: "mod-cta" });
    runBtn.addEventListener("click", () => {
      const individual: PromptEntry[] = [];
      const combined:   PromptEntry[] = [];
      this.prompts.forEach((p) => {
        if      (states[p.name] === "single")   individual.push(p);
        else if (states[p.name] === "combined") combined.push(p);
      });
      this.close();
      this.onSubmit({ individual, combined }, { ...states }, currentMaxSent);
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ─────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────

class OllamaSettingTab extends PluginSettingTab {
  plugin: OllamaTextProcessorPlugin;

  constructor(app: App, plugin: OllamaTextProcessorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Local Ollama Settings" });

    new Setting(containerEl)
      .setName("Ollama Server URL")
      .setDesc("Default: http://localhost:11434")
      .addText((t: TextComponent) =>
        t.setPlaceholder("http://localhost:11434")
          .setValue(this.plugin.settings.ollamaUrl)
          .onChange(async (v) => {
            this.plugin.settings.ollamaUrl = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Ollama Model Name")
      .setDesc("Exact model name as installed in Ollama")
      .addText((t: TextComponent) =>
        t.setPlaceholder("llama3.1:8b")
          .setValue(this.plugin.settings.ollamaModel)
          .onChange(async (v) => {
            this.plugin.settings.ollamaModel = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Variations mode")
      .setDesc("Each prompt returns multiple variations to choose from instead of one output.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.variationsMode)
          .onChange(async (v) => {
            this.plugin.settings.variationsMode = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Number of variations")
      .setDesc("How many variants per prompt when variations mode is on. 3–5 recommended for local models.")
      .addSlider((s) =>
        s.setLimits(2, 8, 1)
          .setValue(this.plugin.settings.variationsCount)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.variationsCount = v;
            await this.plugin.saveSettings();
          })
      );

    const sentLimitSetting = new Setting(containerEl)
      .setName("Default output sentence limit")
      .setDesc("Maximum sentences per AI output. 0 = unlimited. Can also be adjusted per-run in the prompt menu.");

    const sentLimitDisplay = sentLimitSetting.nameEl.createEl("span");
    sentLimitDisplay.style.cssText = "margin-left:0.75em; font-size:0.85em; font-weight:600; color:var(--text-muted);";

    const refreshDisplay = (v: number) => {
      sentLimitDisplay.textContent = v === 0 ? "(Unlimited)" : `(Max ${v})`;
    };
    refreshDisplay(this.plugin.settings.maxOutputSentences);

    sentLimitSetting.addSlider((s) =>
      s.setLimits(0, 20, 1)
        .setValue(this.plugin.settings.maxOutputSentences)
        .setDynamicTooltip()
        .onChange(async (v) => {
          this.plugin.settings.maxOutputSentences = v;
          refreshDisplay(v);
          await this.plugin.saveSettings();
        })
    );

    new Setting(containerEl)
      .setName("Custom Prompts")
      .setDesc('One per line — format: "Menu Name | Prompt text []". The [] is replaced by your selected/detected text.')
      .addTextArea((t: TextAreaComponent) => {
        t.setPlaceholder("Summarize | Summarize this text: []")
          .setValue(this.plugin.settings.customPrompts)
          .onChange(async (v) => {
            this.plugin.settings.customPrompts = v;
            await this.plugin.saveSettings();
          });
        t.inputEl.rows = 10;
        t.inputEl.cols = 52;
        t.inputEl.style.fontFamily = "monospace";
        t.inputEl.style.fontSize   = "0.85em";
      });

    new Setting(containerEl)
      .setName("Reset remembered prompt selections")
      .setDesc("Clears which prompts were last selected in the AI menu.")
      .addButton((b) =>
        b.setButtonText("Reset")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.promptStates = {};
            await this.plugin.saveSettings();
            new Notice("Prompt selections cleared.");
          })
      );
  }
}
