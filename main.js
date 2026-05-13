/* Ollama Text Processor - Obsidian Plugin */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => OllamaTextProcessorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var MAX_INPUT_WORDS = 512;
var OLLAMA_TIMEOUT_MS = 12e4;
var DEFAULT_PREDICT_COUNT = 3;
var SNAP_LOOKAHEAD = 3;
var TERMINAL_PUNCT = /[.!?…]/;
var OPENING_QUOTES = /["""''«‹(]/;
var CLOSING_QUOTES = /["""''»›)]/;
var DEFAULT_SETTINGS = {
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.1:8b",
  customPrompts: [
    "Fix Grammar | Fix the grammar and spelling in this text. Return ONLY the corrected text, no explanation: []",
    `Remove AI Tells | Rewrite this text to remove all signs of AI-generated language. Remove ALL EM DASHES; ban the words prowess, tapestry, delve, realm, and adept; remove "It's not just X, it's Y" patterns; remove hollow filler phrases. Return ONLY the cleaned text: []`,
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
    "Prose to Dialogue | Rewrite as a short dialogue exchange between two characters. Return ONLY the dialogue: []"
  ].join("\n"),
  variationsMode: false,
  variationsCount: 5,
  maxOutputSentences: 0,
  promptStates: {}
};
var PROMPT_INFO = {
  "Fix Grammar": {
    description: "Corrects spelling mistakes and grammatical errors.",
    example: 'Before: "She runned to the store and buyed milk."\nAfter:  "She ran to the store and bought milk."'
  },
  "Remove AI Tells": {
    description: "Strips AI writing patterns: em dashes, banned words, hollow filler phrases.",
    example: `Before: "It's not just a tool \u2014 it's a way to delve into your own prowess."
After:  "It's a tool that helps you understand your own strengths."`
  },
  "Cut Clutter": {
    description: "Removes filler words, redundant phrases, and padding.",
    example: 'Before: "Due to the fact that it was raining, we decided to stay inside."\nAfter:  "Because it was raining, we stayed inside."'
  },
  "Concretise": {
    description: "Swaps vague or abstract words for specific, tangible ones.",
    example: 'Before: "She placed the object on the surface."\nAfter:  "She placed the coffee mug on the kitchen counter."'
  },
  "Active Voice": {
    description: "Rewrites passive constructions so the subject acts.",
    example: 'Before: "The report was written by the team."\nAfter:  "The team wrote the report."'
  },
  "Tighten Dialogue": {
    description: "Makes dialogue sound like real speech.",
    example: `Before: "I must confess that I am rather displeased."
After:  "I'm not happy about this."`
  },
  "Sensory Detail": {
    description: "Adds specific sensory details to bring a scene alive.",
    example: 'Before: "The kitchen was warm."\nAfter:  "The kitchen smelled of burnt butter and the radiator ticked."'
  },
  "Show Don't Tell": {
    description: "Replaces stated emotions with physical signs that imply them.",
    example: `Before: "She was nervous."
After:  "Her hands wouldn't stay still."`
  },
  "Vary Sentence Length": {
    description: "Mixes short and long sentences to create rhythm.",
    example: 'Before: "He walked. He opened it. He stepped outside."\nAfter:  "He walked to the door and opened it. He stepped outside. The cold hit him."'
  },
  "Fix Grammar (Preserve Voice)": {
    description: "Fixes only clear-cut errors. Leaves your sentence rhythm, vocabulary, and style untouched.",
    example: `Before: "He don't care about nothing no more."
After:  "He doesn't care about anything anymore."`
  },
  "Strengthen the Lead": {
    description: "Rewrites the opening to hook immediately with something specific.",
    example: 'Before: "Tourism is important to many economies."\nAfter:  "On a Tuesday in March, the last hotel on the island closed."'
  },
  "Fix the Ending": {
    description: "Rewrites closing lines so the piece ends with purpose.",
    example: 'Before: "Overall, it was interesting and taught me a lot."\nAfter:  "I still think about the way the light looked that afternoon."'
  },
  "Unify the Paragraph": {
    description: "Removes sentences that drift off the paragraph's main idea.",
    example: 'Before: "The park was quiet. Birds sang. The council plans to add a car park."\nAfter:  "The park was quiet. Birds sang."'
  },
  "Add a Topic Sentence": {
    description: "Adds a clear opening sentence stating what the paragraph is about.",
    example: 'Before: "Prices rose. Wages stagnated. Savings shrank."\nAfter:  "The cost of living squeezed households. Prices rose. Wages stagnated."'
  },
  "Cut Metadiscourse": {
    description: "Removes phrases that describe what the writing will do instead of just doing it.",
    example: 'Before: "In this section I will explain why the policy failed."\nAfter:  "The policy failed for three reasons."'
  },
  "Unpack Jargon": {
    description: "Rewrites technical language into plain English.",
    example: `Before: "The API returns a 401 on unauthenticated requests."
After:  "The system rejects requests from users who haven't logged in."`
  },
  "Formal Register": {
    description: "Converts casual writing to formal academic or professional English.",
    example: `Before: "Honestly it's a bit all over the place."
After:  "The argument lacks coherence."`
  },
  "Informal / Conversational": {
    description: "Loosens formal writing into natural, friendly speech.",
    example: 'Before: "It is advisable to consult a medical professional."\nAfter:  "Talk to a doctor first."'
  },
  "Tense Consistency": {
    description: "Finds and fixes unintentional verb tense shifts.",
    example: 'Before: "She walked in and sits down."\nAfter:  "She walked in and sat down."'
  },
  "Signpost the Logic": {
    description: "Adds transitional words and bridge sentences.",
    example: 'Before: "Sales fell. The team hired three new reps."\nAfter:  "Sales fell. As a result, the team hired three new reps."'
  },
  "Write a Profile Opening": {
    description: "Writes a vivid profile opener starting with the person in action.",
    example: `Input: Notes about a chef.
After:  "At 5 a.m., before the fish market opens, she's already tasting the broth."`
  },
  "Write a Place Description": {
    description: "Writes a sensory paragraph about a place using the supplied details.",
    example: 'Input: Notes about a bus depot.\nAfter:  "The depot smelled of diesel and damp concrete."'
  },
  "Summarise in One Sentence": {
    description: "Distils the entire text into one sentence of 25 words or fewer.",
    example: 'Before: (400-word article)\nAfter:  "Cities that invest in bike lanes see fewer car trips."'
  },
  "Summarise in One Paragraph": {
    description: "Produces a 3-5 sentence summary.",
    example: 'Before: (long report)\nAfter:  "The report examines three causes of staff turnover\u2026"'
  },
  "Expand with Examples": {
    description: "Adds one or two short concrete examples to illustrate the main point.",
    example: 'Before: "Good onboarding reduces churn."\nAfter:  "Good onboarding reduces churn. Slack walks new users through their first channel."'
  },
  "Trim to Half": {
    description: "Cuts the text to roughly half its length.",
    example: "Before: (200 words with padding)\nAfter:  (~100 words, all key ideas intact)"
  },
  "Dialogue to Prose": {
    description: "Converts a dialogue exchange to close third-person prose.",
    example: `Before: "\\"You're late.\\" \\"I know.\\""
After:  "She looked up when he came in. He didn't apologise."`
  },
  "Prose to Dialogue": {
    description: "Rewrites a prose passage as dialogue between two characters.",
    example: `Before: "He told her he was leaving."
After:  "\\"I'm leaving.\\" She kept her eyes on the window."`
  }
};
function extractTaggedVariants(raw, count) {
  const strict = [];
  for (let i = 1; i <= count; i++) {
    const rx = new RegExp(`\\[V${i}\\]([\\s\\S]*?)\\[/V${i}\\]`, "i");
    const m = raw.match(rx);
    if (m) {
      const cleaned = m[1].replace(/\[V\d+\]/gi, "").replace(/\[\/V\d+\]/gi, "").trim();
      if (cleaned.length > 0)
        strict.push(cleaned);
    }
  }
  if (strict.length > 0)
    return strict;
  const splitRx = /\[V\d+\]/gi;
  const parts = raw.split(splitRx).map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length > 0)
    return parts.slice(0, count);
  return [raw.trim()];
}
function getPrecedingContext(editor, cursorLine, cursorCh, maxChars = 800) {
  const lines = [];
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
function isFragment(text) {
  const t = text.trimEnd();
  if (t.length === 0)
    return false;
  return !TERMINAL_PUNCT.test(t[t.length - 1]);
}
function hasAlphanumeric(text) {
  return /[a-zA-Z0-9]/.test(text);
}
function truncateWords(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords)
    return [text, false];
  return [words.slice(0, maxWords).join(" "), true];
}
function sentenceLimitClause(max, context) {
  if (max <= 0)
    return "";
  const noun = max === 1 ? "sentence" : "sentences";
  switch (context) {
    case "variations":
      return `Each variation must be no longer than ${max} ${noun}. `;
    case "predict":
      return `Each predicted sentence must be no more than ${max} ${noun}. `;
    case "finish":
      return `The completion must be no longer than ${max} ${noun}. `;
    default:
      return `Your entire response must be no more than ${max} ${noun}. `;
  }
}
function snapSelectionBoundaries(editor, startPos, endPos, _selectedText) {
  var _a, _b, _c, _d, _e;
  let { line: sl, ch: sc } = startPos;
  let { line: el, ch: ec } = endPos;
  let wasSnapped = false;
  const startLine = editor.getLine(sl);
  const endLine = editor.getLine(el);
  if (ec < endLine.length && /\w/.test(endLine[ec]) && /\w/.test((_a = endLine[ec - 1]) != null ? _a : "")) {
    while (ec < endLine.length && /\w/.test(endLine[ec]))
      ec++;
    wasSnapped = true;
  }
  {
    let probe = ec;
    if (probe < endLine.length && endLine[probe] === " ")
      probe++;
    if (probe < endLine.length && TERMINAL_PUNCT.test(endLine[probe]) && probe - ec <= SNAP_LOOKAHEAD) {
      ec = probe + 1;
      wasSnapped = true;
      if (ec < endLine.length && CLOSING_QUOTES.test(endLine[ec])) {
        ec++;
        wasSnapped = true;
      }
    }
  }
  if (sc > 0 && /\w/.test((_b = startLine[sc]) != null ? _b : "") && /\w/.test((_c = startLine[sc - 1]) != null ? _c : "")) {
    while (sc > 0 && /\w/.test((_d = startLine[sc - 1]) != null ? _d : ""))
      sc--;
    wasSnapped = true;
  }
  if (sc > 0 && OPENING_QUOTES.test((_e = startLine[sc - 1]) != null ? _e : "")) {
    sc--;
    wasSnapped = true;
  }
  let text;
  if (sl === el) {
    text = endLine.slice(sc, ec);
  } else {
    const firstPart = startLine.slice(sc);
    const lastPart = endLine.slice(0, ec);
    const midLines = [];
    for (let ln = sl + 1; ln < el; ln++)
      midLines.push(editor.getLine(ln));
    text = [firstPart, ...midLines, lastPart].join("\n");
  }
  return { start: { line: sl, ch: sc }, end: { line: el, ch: ec }, text, wasSnapped };
}
var OllamaTextProcessorPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.activeDropdown = null;
    this.debugMode = false;
    // set to false to disable debug logging
    this.logDump = [];
  }
  async onload() {
    console.log("[OllamaPlugin] onload()");
    await this.loadSettings();
    this.addSettingTab(new OllamaSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        this.buildMenuItem(menu, editor);
      })
    );
    this.addCommand({
      id: "ollama-run-at-cursor",
      name: "Run AI at cursor (uses saved prompt settings)",
      editorCallback: (editor) => {
        this.runAtCursor(editor);
      }
    });
  }
  async runAtCursor(editor) {
    var _a;
    let targetText = "";
    let captureMode = "sentence";
    let rangeStart = { line: 0, ch: 0 };
    let rangeEnd = { line: 0, ch: 0 };
    let paragraphContext = "";
    const rawSelection = editor.getSelection();
    if (rawSelection && rawSelection.trim().length > 0) {
      if (!hasAlphanumeric(rawSelection))
        return;
      const from = editor.getCursor("from");
      const to = editor.getCursor("to");
      const snapped = snapSelectionBoundaries(editor, from, to, rawSelection);
      rangeStart = snapped.start;
      rangeEnd = snapped.end;
      targetText = snapped.text;
      captureMode = isFragment(targetText) ? "finish-fragment" : "selection";
      paragraphContext = getPrecedingContext(editor, rangeStart.line, rangeStart.ch);
    } else {
      const cursor = editor.getCursor();
      const lineText = editor.getLine(cursor.line);
      const sentenceRx = /[^.!?…]+[.!?…]*\s*/g;
      let match;
      let foundSentence = false;
      while ((match = sentenceRx.exec(lineText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (start <= cursor.ch && cursor.ch < end) {
          targetText = match[0].trim();
          rangeStart = { line: cursor.line, ch: start };
          rangeEnd = { line: cursor.line, ch: end };
          foundSentence = true;
          captureMode = isFragment(targetText) ? "finish-fragment" : "sentence";
          if (captureMode === "finish-fragment") {
            paragraphContext = getPrecedingContext(editor, cursor.line, start);
          }
          break;
        }
      }
      if (!foundSentence) {
        if (lineText.trim().length > 0) {
          const lastPunctMatch = lineText.match(/[.!?]['"'"]?\s+/g);
          const lastPunctIdx = lastPunctMatch ? lineText.lastIndexOf(lastPunctMatch[lastPunctMatch.length - 1]) + lastPunctMatch[lastPunctMatch.length - 1].length : 0;
          const fragment = lineText.slice(lastPunctIdx).trim();
          const fragmentStart = lastPunctIdx + (lineText.slice(lastPunctIdx).length - lineText.slice(lastPunctIdx).trimStart().length);
          targetText = fragment.length > 0 ? fragment : lineText.trim();
          const effectiveStart = fragment.length > 0 ? fragmentStart : lineText.length - lineText.trimStart().length;
          if (isFragment(targetText)) {
            captureMode = "finish-fragment";
            rangeStart = { line: cursor.line, ch: effectiveStart };
            rangeEnd = { line: cursor.line, ch: lineText.length };
            paragraphContext = getPrecedingContext(editor, cursor.line, effectiveStart);
          } else {
            captureMode = "predict-next";
            rangeStart = { line: cursor.line, ch: lineText.length };
            rangeEnd = { line: cursor.line, ch: lineText.length };
            paragraphContext = getPrecedingContext(editor, cursor.line, lineText.length);
          }
        } else {
          let prevLine = cursor.line - 1;
          while (prevLine > 0 && editor.getLine(prevLine).trim() === "")
            prevLine--;
          const prevText = editor.getLine(prevLine);
          if (prevLine >= 0 && prevText.trim().length > 0) {
            captureMode = "predict-next";
            targetText = prevText.trim();
            rangeStart = { line: cursor.line, ch: 0 };
            rangeEnd = { line: cursor.line, ch: 0 };
            paragraphContext = getPrecedingContext(editor, prevLine, prevText.length);
          }
        }
      }
    }
    if (!targetText || targetText.trim().length === 0) {
      new import_obsidian.Notice("No text found at cursor. (N0)");
      return;
    }
    let truncated = false;
    if (captureMode !== "predict-next" && captureMode !== "finish-fragment") {
      [targetText, truncated] = truncateWords(targetText, MAX_INPUT_WORDS);
    }
    if (captureMode === "predict-next" || captureMode === "finish-fragment") {
      await this.handleMenuClick(
        editor,
        targetText,
        captureMode,
        rangeStart,
        rangeEnd,
        paragraphContext,
        truncated
      );
      return;
    }
    const savedStates = (_a = this.settings.promptStates) != null ? _a : {};
    const hasAnyActive = Object.values(savedStates).some(
      (s) => s === "single" || s === "combined"
    );
    if (!hasAnyActive) {
      new import_obsidian.Notice("No prompts configured yet. Opening prompt menu\u2026 (SETUP)");
      await this.handleMenuClick(
        editor,
        targetText,
        captureMode,
        rangeStart,
        rangeEnd,
        paragraphContext,
        truncated
      );
      return;
    }
    const prompts = this.settings.customPrompts.split("\n").filter((l) => l.includes("|")).map((l) => {
      const idx = l.indexOf("|");
      return { name: l.slice(0, idx).trim(), template: l.slice(idx + 1).trim() };
    });
    const individual = [];
    const combined = [];
    prompts.forEach((p) => {
      var _a2;
      const state = (_a2 = savedStates[p.name]) != null ? _a2 : "off";
      if (state === "single")
        individual.push(p);
      else if (state === "combined")
        combined.push(p);
    });
    if (individual.length === 0 && combined.length === 0) {
      new import_obsidian.Notice("No prompts configured yet. Opening prompt menu\u2026 (SETUP)");
      await this.handleMenuClick(
        editor,
        targetText,
        captureMode,
        rangeStart,
        rangeEnd,
        paragraphContext,
        truncated
      );
      return;
    }
    if (truncated) {
      new import_obsidian.Notice(
        `\u26A0 Input capped at ${MAX_INPUT_WORDS} words.`,
        6e3
      );
    }
    const maxSent = this.settings.maxOutputSentences;
    const taskCount = individual.length + (combined.length > 0 ? 1 : 0);
    const dismissSpinner = this.showLoadingSpinner(
      editor,
      rangeStart,
      this.settings.variationsMode ? `Running ${taskCount} task(s), ${this.settings.variationsCount} variants each\u2026` : `Running ${taskCount} AI task(s)\u2026`
    );
    const candidates = [];
    try {
      for (const p of individual) {
        const limitClause = sentenceLimitClause(maxSent, "normal");
        const basePrompt = p.template.includes("[]") ? p.template.replace(/\[\]/g, targetText) : p.template + "\n\n" + targetText;
        const finalPrompt = limitClause ? basePrompt.replace(/(Return ONLY[^:]*:)/i, `$1 ${limitClause.trim()}`) : basePrompt;
        try {
          if (this.settings.variationsMode) {
            const variants = await this.getOllamaVariations(
              p.template.includes("[]") ? p.template.replace(/\[\]/g, targetText) : p.template + "\n\n" + targetText,
              this.settings.variationsCount,
              maxSent
            );
            variants.forEach(
              (v, i) => candidates.push({ text: v, sourceNames: [`${p.name} \u2014 variant ${i + 1}`] })
            );
          } else {
            const result = await this.getOllamaResponse(finalPrompt);
            candidates.push({ text: result, sourceNames: [p.name] });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          new import_obsidian.Notice(`Ollama Error (E_TASK): ${msg} for "${p.name}"`);
        }
      }
      if (combined.length > 0) {
        const actions = combined.map(
          (p) => p.template.replace(/\[\]/g, "").replace(/return only.*$/i, "").replace(/\s{2,}/g, " ").trim().replace(/[.:]$/, "").toLowerCase()
        );
        const fusedInstruction = actions.length === 1 ? `Take the following text and ${actions[0]}.` : `Take the following text and ${actions.slice(0, -1).join(", ")}, and ${actions[actions.length - 1]}.`;
        const limitClause = sentenceLimitClause(maxSent, "normal");
        const combinedPrompt = fusedInstruction + " Apply all changes at once and return ONLY the final result." + (limitClause ? " " + limitClause.trim() : "") + " Do not explain, do not list steps, do not number outputs. Output exactly one block of text.\n\nText:\n" + targetText;
        try {
          if (this.settings.variationsMode) {
            const variants = await this.getOllamaVariations(
              fusedInstruction + " Apply all changes at once. Do not explain, do not list steps.\n\nText:\n" + targetText,
              this.settings.variationsCount,
              maxSent
            );
            variants.forEach(
              (v, i) => candidates.push({
                text: v,
                sourceNames: [...combined.map((p) => p.name), `variant ${i + 1}`]
              })
            );
          } else {
            const result = await this.getOllamaResponse(combinedPrompt);
            candidates.push({ text: result, sourceNames: combined.map((p) => p.name) });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          new import_obsidian.Notice(`Ollama Error (E_COMBINED): ${msg}`);
        }
      }
    } finally {
      dismissSpinner();
    }
    if (candidates.length === 0) {
      new import_obsidian.Notice("All AI calls failed. Nothing to choose from. (E_ALL)");
      return;
    }
    this.showInlineSuggestions(editor, rangeStart, rangeEnd, targetText, candidates, captureMode);
  }
  // ── Menu item construction ──────────────────────────────────────────────
  buildMenuItem(menu, editor) {
    let targetText = "";
    let captureMode = "sentence";
    let rangeStart = { line: 0, ch: 0 };
    let rangeEnd = { line: 0, ch: 0 };
    let paragraphContext = "";
    const rawSelection = editor.getSelection();
    if (rawSelection && rawSelection.trim().length > 0) {
      if (!hasAlphanumeric(rawSelection))
        return;
      const from = editor.getCursor("from");
      const to = editor.getCursor("to");
      const snapped = snapSelectionBoundaries(editor, from, to, rawSelection);
      rangeStart = snapped.start;
      rangeEnd = snapped.end;
      targetText = snapped.text;
      captureMode = isFragment(targetText) ? "finish-fragment" : "selection";
      paragraphContext = getPrecedingContext(editor, rangeStart.line, rangeStart.ch);
    } else {
      const cursor = editor.getCursor();
      const lineText = editor.getLine(cursor.line);
      const sentenceRx = /[^.!?…]+[.!?…]*\s*/g;
      let match;
      let foundSentence = false;
      while ((match = sentenceRx.exec(lineText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (start <= cursor.ch && cursor.ch < end) {
          targetText = match[0].trim();
          rangeStart = { line: cursor.line, ch: start };
          rangeEnd = { line: cursor.line, ch: end };
          foundSentence = true;
          captureMode = isFragment(targetText) ? "finish-fragment" : "sentence";
          if (captureMode === "finish-fragment") {
            paragraphContext = getPrecedingContext(editor, cursor.line, start);
          }
          break;
        }
      }
      if (!foundSentence) {
        if (lineText.trim().length > 0) {
          const lastPunctMatch = lineText.match(/[.!?]['"'"]?\s+/g);
          const lastPunctIdx = lastPunctMatch ? lineText.lastIndexOf(lastPunctMatch[lastPunctMatch.length - 1]) + lastPunctMatch[lastPunctMatch.length - 1].length : 0;
          const fragment = lineText.slice(lastPunctIdx).trim();
          const fragmentStart = lastPunctIdx + (lineText.slice(lastPunctIdx).length - lineText.slice(lastPunctIdx).trimStart().length);
          targetText = fragment.length > 0 ? fragment : lineText.trim();
          const effectiveStart = fragment.length > 0 ? fragmentStart : lineText.length - lineText.trimStart().length;
          if (isFragment(targetText)) {
            captureMode = "finish-fragment";
            rangeStart = { line: cursor.line, ch: effectiveStart };
            rangeEnd = { line: cursor.line, ch: lineText.length };
            paragraphContext = getPrecedingContext(editor, cursor.line, effectiveStart);
          } else {
            captureMode = "predict-next";
            rangeStart = { line: cursor.line, ch: lineText.length };
            rangeEnd = { line: cursor.line, ch: lineText.length };
            paragraphContext = getPrecedingContext(editor, cursor.line, lineText.length);
          }
        } else {
          let prevLine = cursor.line - 1;
          while (prevLine > 0 && editor.getLine(prevLine).trim() === "")
            prevLine--;
          const prevText = editor.getLine(prevLine);
          if (prevLine >= 0 && prevText.trim().length > 0) {
            captureMode = "predict-next";
            targetText = prevText.trim();
            rangeStart = { line: cursor.line, ch: 0 };
            rangeEnd = { line: cursor.line, ch: 0 };
            paragraphContext = getPrecedingContext(editor, prevLine, prevText.length);
          }
        }
      }
    }
    if (!targetText || targetText.trim().length === 0)
      return;
    let truncated = false;
    if (captureMode !== "predict-next" && captureMode !== "finish-fragment") {
      [targetText, truncated] = truncateWords(targetText, MAX_INPUT_WORDS);
    }
    const capText = targetText;
    const capMode = captureMode;
    const capStart = { ...rangeStart };
    const capEnd = { ...rangeEnd };
    const capContext = paragraphContext;
    const capTruncated = truncated;
    const menuTitle = capMode === "predict-next" ? "AI: Predict Next Sentence..." : capMode === "finish-fragment" ? "AI: Finish Sentence..." : "AI: Process Text...";
    menu.addItem((item) => {
      item.setTitle(menuTitle).setIcon("bot-message-square").onClick(() => this.handleMenuClick(editor, capText, capMode, capStart, capEnd, capContext, capTruncated, true));
    });
  }
  // ── Menu click handler ──────────────────────────────────────────────────
  async handleMenuClick(editor, capText, capMode, capStart, capEnd, capContext, capTruncated, showModal = false) {
    if (capTruncated) {
      new import_obsidian.Notice(
        `\u26A0 Input capped at ${MAX_INPUT_WORDS} words. Only the first ${MAX_INPUT_WORDS} words were sent.`,
        6e3
      );
    }
    const maxSent = this.settings.maxOutputSentences;
    if ((capMode === "predict-next" || capMode === "finish-fragment") && !showModal) {
      const count = this.settings.variationsMode ? this.settings.variationsCount : DEFAULT_PREDICT_COUNT;
      const dismissSpinner = this.showLoadingSpinner(
        editor,
        capStart,
        capMode === "predict-next" ? `Predicting sentence\u2026` : `Generating ${count} completions\u2026`
      );
      try {
        let prompt;
        if (capMode === "predict-next") {
          const limitClause = sentenceLimitClause(maxSent, "predict");
          prompt = `You are a writing assistant. Below is a passage of text.
Predict the next sentence that would naturally follow.
Produce exactly ${count} different possible next sentences.
` + (limitClause ? `${limitClause}
` : "") + `Each should continue the passage naturally but offer a different direction, detail, or tone.
Wrap each option in tags:
[V1]first sentence here[/V1]
[V2]second sentence here[/V2]
...and so on up to [V${count}].
Output ONLY the tagged sentences. No explanation. No text outside the tags.

Passage:
${capContext}`;
        } else {
          const limitClause = sentenceLimitClause(maxSent, "finish");
          prompt = `You are a writing assistant. Complete the unfinished sentence fragment below into a full, natural sentence.

Rules:
- Output the COMPLETE sentence from start to finish.
- The sentence MUST begin with the exact characters of the fragment, unchanged.
- Do NOT alter, rephrase, or skip any part of the fragment.
- Simply continue the fragment naturally until the sentence is complete.

Examples:
- Fragment: "His savings wer" \u2192 output: "His savings were dwindling fast."
- Fragment: "I want to " \u2192 output: "I want to break free."
- Fragment: "She wal" \u2192 output: "She walked into the room."

Produce exactly ${count} different completed sentences.
` + (limitClause ? `${limitClause}
` : "") + `Wrap each in tags:
[V1]full sentence here[/V1]
[V2]full sentence here[/V2]
...and so on up to [V${count}].
Output ONLY the tagged sentences. No explanation. No text outside the tags.

Fragment: "${capText}"

Preceding context:
${capContext}`;
        }
        const raw = await this.callOllama(prompt);
        const variants = extractTaggedVariants(raw, count);
        const ensureTerminated = (t) => {
          const s = t.trim();
          if (s.length === 0)
            return s;
          const last = s[s.length - 1];
          return /[.!?]/.test(last) ? s : s + ".";
        };
        const candidates = variants.length > 0 ? variants.map((v, i) => ({
          text: ensureTerminated(v),
          sourceNames: [capMode === "predict-next" ? `${i + 1}` : `Completion ${i + 1}`]
        })) : [{
          text: ensureTerminated(raw),
          sourceNames: ["AI suggestion"]
        }];
        this.showInlineSuggestions(editor, capStart, capEnd, capText, candidates, capMode);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        new import_obsidian.Notice(`Ollama Error (E_PREDICT): ${msg}`);
      } finally {
        dismissSpinner();
      }
      return;
    }
    const prompts = this.settings.customPrompts.split("\n").filter((l) => l.includes("|")).map((l) => {
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
        this.settings.promptStates = newStates;
        this.settings.maxOutputSentences = newMaxSent;
        await this.saveSettings();
        const { individual, combined } = selection;
        if (individual.length === 0 && combined.length === 0) {
          new import_obsidian.Notice("No prompts selected. Action cancelled. (N0)");
          return;
        }
        const taskCount = individual.length + (combined.length > 0 ? 1 : 0);
        const dismissSpinner = this.showLoadingSpinner(
          editor,
          capStart,
          this.settings.variationsMode ? `Running ${taskCount} task(s), ${this.settings.variationsCount} variants each\u2026` : `Running ${taskCount} AI task(s)\u2026`
        );
        const candidates = [];
        try {
          for (const p of individual) {
            const limitClause = sentenceLimitClause(newMaxSent, "normal");
            const basePrompt = p.template.includes("[]") ? p.template.replace(/\[\]/g, capText) : p.template + "\n\n" + capText;
            const finalPrompt = limitClause ? basePrompt.replace(/(Return ONLY[^:]*:)/i, `$1 ${limitClause.trim()}`) : basePrompt;
            try {
              if (this.settings.variationsMode) {
                const variants = await this.getOllamaVariations(
                  p.template.includes("[]") ? p.template.replace(/\[\]/g, capText) : p.template + "\n\n" + capText,
                  this.settings.variationsCount,
                  newMaxSent
                );
                variants.forEach(
                  (v, i) => candidates.push({ text: v, sourceNames: [`${p.name} \u2014 variant ${i + 1}`] })
                );
              } else {
                const result = await this.getOllamaResponse(finalPrompt);
                candidates.push({ text: result, sourceNames: [p.name] });
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              new import_obsidian.Notice(`Ollama Error (E_TASK): ${msg} for "${p.name}"`);
            }
          }
          if (combined.length > 0) {
            const actions = combined.map(
              (p) => p.template.replace(/\[\]/g, "").replace(/return only.*$/i, "").replace(/\s{2,}/g, " ").trim().replace(/[.:]$/, "").toLowerCase()
            );
            const fusedInstruction = actions.length === 1 ? `Take the following text and ${actions[0]}.` : `Take the following text and ${actions.slice(0, -1).join(", ")}, and ${actions[actions.length - 1]}.`;
            const limitClause = sentenceLimitClause(newMaxSent, "normal");
            const combinedPrompt = fusedInstruction + " Apply all changes at once and return ONLY the final result." + (limitClause ? " " + limitClause.trim() : "") + " Do not explain, do not list steps, do not number outputs. Output exactly one block of text.\n\nText:\n" + capText;
            try {
              if (this.settings.variationsMode) {
                const variants = await this.getOllamaVariations(
                  fusedInstruction + " Apply all changes at once. Do not explain, do not list steps.\n\nText:\n" + capText,
                  this.settings.variationsCount,
                  newMaxSent
                );
                variants.forEach(
                  (v, i) => candidates.push({
                    text: v,
                    sourceNames: [...combined.map((p) => p.name), `variant ${i + 1}`]
                  })
                );
              } else {
                const result = await this.getOllamaResponse(combinedPrompt);
                candidates.push({ text: result, sourceNames: combined.map((p) => p.name) });
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              new import_obsidian.Notice(`Ollama Error (E_COMBINED): ${msg}`);
            }
          }
        } finally {
          dismissSpinner();
        }
        if (candidates.length === 0) {
          new import_obsidian.Notice("All AI calls failed. Nothing to choose from. (E_ALL)");
          return;
        }
        this.showInlineSuggestions(editor, capStart, capEnd, capText, candidates, capMode);
      }
    ).open();
  }
  // ── Ollama API ──────────────────────────────────────────────────────────
  async getOllamaResponse(promptText) {
    return this.callOllama(promptText);
  }
  async getOllamaVariations(promptText, count, maxSentences = 0) {
    const tagList = Array.from({ length: count }, (_, i) => `[V${i + 1}]...[/V${i + 1}]`).join(", ");
    const limitClause = sentenceLimitClause(maxSentences, "variations");
    const variationPrompt = `Produce exactly ${count} different variations of the following editing task.
Each variation applies the same instruction but with different word choices,
sentence structures, or stylistic approaches.
` + (limitClause ? `${limitClause}
` : "") + `Wrap each variation in these exact tags: ${tagList}.
Output ONLY the tagged variations. No text outside the tags. No explanation.

` + promptText;
    const raw = await this.callOllama(variationPrompt);
    const variants = extractTaggedVariants(raw, count);
    if (variants.length === 0) {
      console.warn("[OllamaPlugin] Variation tag parsing failed, using raw response.", { raw });
      return [raw.trim()];
    }
    return variants;
  }
  async callOllama(promptText) {
    const url = this.settings.ollamaUrl.replace(/\/$/, "") + "/api/generate";
    const body = {
      model: this.settings.ollamaModel,
      prompt: promptText,
      system: "You are a precise text editing and writing assistant. Follow instructions exactly. Return ONLY what is asked. Never explain, summarise, or add commentary. Never output any text outside of tag structures you are asked to use. Respect all sentence count limits you are given.",
      stream: false
    };
    const fetchPromise = (0, import_obsidian.requestUrl)({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const timeoutPromise = new Promise(
      (_, reject) => setTimeout(
        () => reject(new Error(`Ollama request timed out after ${OLLAMA_TIMEOUT_MS / 1e3}s`)),
        OLLAMA_TIMEOUT_MS
      )
    );
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    if (res.status !== 200) {
      new import_obsidian.Notice(`Ollama HTTP error (E_HTTP): ${res.status}`);
      throw new Error(`HTTP ${res.status}`);
    }
    let json;
    try {
      json = res.json;
    } catch (e) {
      new import_obsidian.Notice("Ollama JSON parse error (E_JSON)");
      throw e;
    }
    if (!json || typeof json.response !== "string") {
      new import_obsidian.Notice("Ollama response missing 'response' field (E_JSON).");
      throw new Error("Missing 'response' field in Ollama output");
    }
    return json.response.trim();
  }
  dumpLog(msg) {
    if (!this.debugMode)
      return;
    const line = `${new Date().toISOString()} ${msg}`;
    console.log(line);
    this.logDump.push(line);
  }
  async flushLogDump() {
    if (!this.debugMode)
      return;
    if (this.logDump.length === 0)
      return;
    const content = this.logDump.join("\n");
    this.logDump = [];
    const path = "ollama-debug.md";
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(path, content);
    }
    new import_obsidian.Notice("Debug log written to ollama-debug.md");
  }
  // ── Loading spinner ─────────────────────────────────────────────────────
  showLoadingSpinner(editor, anchorLine, label = "Thinking\u2026") {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view)
      return () => {
      };
    const cmEditor = view.contentEl.querySelector(".cm-editor");
    if (!cmEditor)
      return () => {
      };
    const lines = cmEditor.querySelectorAll(".cm-line");
    const lineEl = lines[Math.min(anchorLine.line, lines.length - 1)];
    if (!lineEl)
      return () => {
      };
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
    const ring = document.createElement("div");
    ring.className = "ollama-spinner-ring";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    overlay.appendChild(ring);
    overlay.appendChild(labelEl);
    let dragging = false, dx = 0, dy = 0, ox = 0, oy = 0;
    overlay.addEventListener("mousedown", (e) => {
      dragging = true;
      dx = e.clientX;
      dy = e.clientY;
      ox = overlay.offsetLeft;
      oy = overlay.offsetTop;
      e.preventDefault();
    });
    const onMove = (e) => {
      if (!dragging)
        return;
      overlay.style.left = `${ox + e.clientX - dx}px`;
      overlay.style.top = `${oy + e.clientY - dy}px`;
    };
    const onUp = () => {
      dragging = false;
    };
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
  showInlineSuggestions(editor, start, end, _originalText, candidates, capMode = "sentence") {
    var _a, _b;
    _originalText = capMode === "predict-next" ? "" : _originalText;
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) {
      this.dumpLog(`[OllamaDropdown] FALLBACK: no view`);
      void this.flushLogDump();
      editor.replaceRange(candidates[0].text, start, end);
      new import_obsidian.Notice("Applied first AI output (no view). (FALLBACK)");
      return;
    }
    const cmEditor = view.contentEl.querySelector(".cm-editor");
    if (!cmEditor) {
      this.dumpLog(`[OllamaDropdown] FALLBACK: no cmEditor`);
      void this.flushLogDump();
      editor.replaceRange(candidates[0].text, start, end);
      new import_obsidian.Notice("Applied first AI output (no editor). (FALLBACK)");
      return;
    }
    const lines = cmEditor.querySelectorAll(".cm-line");
    if (start.line < 0 || start.line >= lines.length) {
      this.dumpLog(`[OllamaDropdown] FALLBACK: line out of range, start.line: ${start.line} lines.length: ${lines.length}`);
      void this.flushLogDump();
      editor.replaceRange(candidates[0].text, start, end);
      new import_obsidian.Notice("Applied first AI output (line out of range). (FALLBACK)");
      return;
    }
    const lineEl = lines[start.line];
    const lineRect = lineEl.getBoundingClientRect();
    const calcInsertion = (text) => {
      var _a2;
      if (_originalText !== "" && text.toLowerCase().startsWith(_originalText.toLowerCase().trimEnd())) {
        return text;
      }
      const lineText = editor.getLine(start.line);
      const charBefore = start.ch > 0 ? lineText[start.ch - 1] : "";
      const firstChar = (_a2 = text[0]) != null ? _a2 : "";
      const midWord = /[a-zA-Z0-9]/.test(charBefore);
      if (midWord && firstChar === " ")
        return text.trimStart();
      if (charBefore === " " && firstChar === " ")
        return text.trimStart();
      if (!midWord && charBefore !== " " && charBefore !== "" && /[a-zA-Z0-9]/.test(firstChar))
        return " " + text;
      return text;
    };
    const calcEndAfterInsertion = (insertionStart, insertion) => {
      const insertionLines = insertion.split("\n");
      if (insertionLines.length === 1) {
        return { line: insertionStart.line, ch: insertionStart.ch + insertion.length };
      }
      return { line: insertionStart.line + insertionLines.length - 1, ch: insertionLines[insertionLines.length - 1].length };
    };
    const longestCandidate = candidates.reduce((a, b) => a.text.length > b.text.length ? a : b);
    const longestInsertion = calcInsertion(longestCandidate.text);
    const longestEnd = calcEndAfterInsertion(start, longestInsertion);
    const anchorLineIndex = Math.min(longestEnd.line, lines.length - 1);
    const anchorLineEl = lines[anchorLineIndex];
    const anchorRect = anchorLineEl.getBoundingClientRect();
    this.dumpLog(`[OllamaDropdown] start.line: ${start.line} end.line: ${end.line}`);
    this.dumpLog(`[OllamaDropdown] lineRect: ${JSON.stringify({ top: lineRect.top, bottom: lineRect.bottom, left: lineRect.left })}`);
    this.dumpLog(`OllamaDropdown placing at left=${anchorRect.left} top=${anchorRect.bottom + 8}`);
    void this.flushLogDump();
    const dropdown = document.createElement("div");
    dropdown.className = "ollama-output-dropdown";
    dropdown.style.cssText = `position:fixed; left:${anchorRect.left}px; top:${anchorRect.bottom + 64}px;
      min-width:220px; max-width:520px;
      max-height:60vh; overflow-y:auto;
      background:color-mix(in srgb, var(--background-primary, #ffffff) 65%, transparent);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      border:1px solid var(--background-modifier-border);
      border-radius:6px;
      box-shadow:0 4px 16px rgba(0,0,0,0.3);
      z-index:9999; font-size:0.85em;
    `;
    this.activeDropdown = dropdown;
    let dragging = false, dx = 0, dy = 0, ox = 0, oy = 0;
    const dragHandle = document.createElement("div");
    dragHandle.textContent = "Variants";
    dragHandle.style.cssText = `
      font-size:0.8em; padding:0.2em 0.5em; cursor:move; font-weight:600;
      border-bottom:1px solid var(--background-modifier-border);
      color:var(--text-muted); user-select:none;
    `;
    dropdown.appendChild(dragHandle);
    dragHandle.addEventListener("mousedown", (e) => {
      dragging = true;
      dx = e.clientX;
      dy = e.clientY;
      ox = dropdown.offsetLeft;
      oy = dropdown.offsetTop;
      e.preventDefault();
    });
    const onDragMove = (e) => {
      if (!dragging)
        return;
      dropdown.style.left = `${ox + e.clientX - dx}px`;
      dropdown.style.top = `${oy + e.clientY - dy}px`;
    };
    const onDragEnd = () => {
      dragging = false;
    };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    const cleanup = () => {
      if (this.activeDropdown === dropdown)
        this.activeDropdown = null;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
    };
    const apply = (text) => {
      var _a2;
      if (_originalText !== "" && text.toLowerCase().startsWith(_originalText.toLowerCase().trimEnd())) {
        editor.replaceRange(text, start, end);
        dropdown.remove();
        cleanup();
        return;
      }
      const line = editor.getLine(start.line);
      const charBefore = start.ch > 0 ? line[start.ch - 1] : "";
      const firstChar = (_a2 = text[0]) != null ? _a2 : "";
      const midWord = /[a-zA-Z0-9]/.test(charBefore);
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
    let previewActive = false;
    let previewEnd = { line: end.line, ch: end.ch };
    const originalEnd = { line: end.line, ch: end.ch };
    const previewText = (text) => {
      this.dumpLog(`[Preview] previewText called, previewActive: ${previewActive}`);
      this.dumpLog(`[Preview] start: ${JSON.stringify(start)} previewEnd: ${JSON.stringify(previewEnd)} originalEnd: ${JSON.stringify(originalEnd)}`);
      if (previewActive) {
        this.dumpLog(`[Preview] restoring before new preview, replacing start\u2192previewEnd with originalText: "${_originalText}"`);
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
      const actualInDoc = editor.getRange(start, previewEnd);
      this.dumpLog(`[Preview] actual text in doc at start\u2192previewEnd: "${actualInDoc}"`);
      this.dumpLog(`[Preview] actualInDoc.length: ${actualInDoc.length}, previewEnd.ch - start.ch: ${previewEnd.ch - start.ch}`);
      editor.replaceRange(_originalText, start, previewEnd);
      previewActive = false;
      previewEnd = { line: originalEnd.line, ch: originalEnd.ch };
      this.dumpLog(`[Preview] replaceRange called, checking doc after restore...`);
      const afterRestore = editor.getRange(start, previewEnd);
      this.dumpLog(`[Preview] text in doc at start\u2192originalEnd after restore: "${afterRestore}"`);
      void this.flushLogDump();
    };
    const stripVariant = (names) => names.filter((n) => !/^variant \d+$/i.test(n)).join(", ");
    const firstSource = stripVariant((_b = (_a = candidates[0]) == null ? void 0 : _a.sourceNames) != null ? _b : []);
    const allSameSource = candidates.every((c) => {
      var _a2;
      return stripVariant((_a2 = c.sourceNames) != null ? _a2 : []) === firstSource;
    });
    candidates.forEach((c, index) => {
      var _a2, _b2;
      const item = document.createElement("div");
      item.style.cssText = "padding:0.3em 0.5em; cursor:pointer; white-space:pre-wrap;";
      const raw = (_a2 = c.sourceNames) != null ? _a2 : [];
      const label = raw.length === 0 ? `Option ${index + 1}` : raw.length <= 3 ? raw.join(", ") : `${raw.slice(0, 3).join(", ")}, and ${raw.length - 3} more`;
      const prevSource = index > 0 ? stripVariant((_b2 = candidates[index - 1].sourceNames) != null ? _b2 : []) : null;
      const thisSource = stripVariant(raw);
      const showHeader = !allSameSource && (index === 0 || thisSource !== prevSource);
      const body = document.createElement("div");
      body.textContent = c.text;
      body.style.color = "var(--text-normal)";
      if (showHeader) {
        const title = document.createElement("div");
        title.textContent = label;
        title.style.cssText = "font-weight:600; margin-bottom:0.15em; font-size:0.9em; color:var(--text-muted);";
        item.appendChild(title);
      }
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
    dismissBtn.textContent = "Dismiss";
    dismissBtn.style.cssText = "cursor:pointer; font-size:0.8em; opacity:0.7; padding:0.1em 0.3em; border-radius:3px;";
    dismissBtn.addEventListener("mouseenter", () => {
      dismissBtn.style.backgroundColor = "var(--background-modifier-hover)";
    });
    dismissBtn.addEventListener("mouseleave", () => {
      dismissBtn.style.backgroundColor = "transparent";
    });
    dismissBtn.addEventListener("click", () => {
      restoreOriginal();
      dropdown.remove();
      cleanup();
      new import_obsidian.Notice("Dismissed AI outputs. (C0)");
    });
    dismissRow.appendChild(dismissBtn);
    dropdown.appendChild(dismissRow);
    const onKey = (evt) => {
      if (evt.key === "Escape") {
        restoreOriginal();
        dropdown.remove();
        cleanup();
        new import_obsidian.Notice("Dismissed AI outputs. (ESC)");
      }
    };
    window.addEventListener("keydown", onKey, true);
    document.body.appendChild(dropdown);
  }
  // ── Settings ────────────────────────────────────────────────────────────
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    if (!this.settings.promptStates || typeof this.settings.promptStates !== "object" || Array.isArray(this.settings.promptStates)) {
      this.settings.promptStates = {};
    }
    if (typeof this.settings.maxOutputSentences !== "number") {
      this.settings.maxOutputSentences = 0;
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var PromptSelectionModal = class extends import_obsidian.Modal {
  constructor(app, prompts, targetText, savedStates, savedMaxSent, onSubmit) {
    super(app);
    this.prompts = prompts;
    this.targetText = targetText;
    this.savedStates = savedStates;
    this.savedMaxSent = savedMaxSent;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Select AI Prompts to Run" });
    contentEl.createEl("p", {
      text: "[ ] Off \u2192 [\u2713] Individual output \u2192 [\u25CE] Merge into one combined output. Selections are remembered.",
      cls: "setting-item-description"
    });
    const wordCount = this.targetText.trim().split(/\s+/).filter(Boolean).length;
    const wcEl = contentEl.createEl("p", {
      text: `Input: ${wordCount} word${wordCount !== 1 ? "s" : ""}`,
      cls: "setting-item-description"
    });
    wcEl.style.marginBottom = "0.75em";
    let currentMaxSent = this.savedMaxSent;
    const limitRow = contentEl.createDiv();
    limitRow.style.cssText = `
      display:flex; align-items:center; gap:0.75em;
      margin-bottom:1em; padding:0.5em 0.25em;
      border-bottom:1px solid var(--background-modifier-border);
    `;
    const limitLabel = limitRow.createEl("span", { text: "Output limit:" });
    limitLabel.style.cssText = "font-size:0.9em; white-space:nowrap; color:var(--text-muted);";
    const slider = limitRow.createEl("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "20";
    slider.step = "1";
    slider.value = String(currentMaxSent);
    slider.style.cssText = "flex:1; cursor:pointer;";
    slider.setAttribute("aria-label", "Maximum output sentences");
    const limitDisplay = limitRow.createEl("span");
    limitDisplay.style.cssText = `
      font-size:0.9em; font-weight:600; min-width:6em; text-align:right;
      color:var(--text-normal); white-space:nowrap;
    `;
    const updateLimitDisplay = (val) => {
      limitDisplay.textContent = val === 0 ? "Unlimited" : `Max ${val} sentence${val === 1 ? "" : "s"}`;
    };
    updateLimitDisplay(currentMaxSent);
    slider.addEventListener("input", () => {
      currentMaxSent = parseInt(slider.value, 10);
      updateLimitDisplay(currentMaxSent);
    });
    const states = {};
    this.prompts.forEach((p) => {
      var _a;
      states[p.name] = (_a = this.savedStates[p.name]) != null ? _a : "off";
    });
    const updateFns = [];
    this.prompts.forEach((p) => {
      const wrapper = contentEl.createDiv();
      wrapper.style.marginBottom = "6px";
      const row = wrapper.createDiv();
      row.style.cssText = "display:flex; align-items:center; gap:8px; padding:2px 0;";
      const stateBtn = row.createEl("button");
      stateBtn.type = "button";
      stateBtn.style.cssText = `
        width:1.6em; height:1.6em; border-radius:3px; flex-shrink:0;
        border:1px solid var(--background-modifier-border);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; font-size:0.9em; padding:0; background:transparent;
      `;
      const nameSpan = row.createEl("span", { text: p.name });
      nameSpan.style.cssText = "flex:1; cursor:pointer; user-select:none;";
      const infoBtn = row.createEl("button");
      infoBtn.type = "button";
      infoBtn.textContent = "\u24D8";
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
      infoPanel.textContent = info ? `${info.description}

${info.example}` : p.template.replace(/\[\]/g, "\u2026").replace(/Return ONLY.*$/i, "").trim();
      let infoVisible = false;
      infoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        infoVisible = !infoVisible;
        infoPanel.style.display = infoVisible ? "block" : "none";
        infoBtn.style.opacity = infoVisible ? "1" : "0.6";
        infoBtn.setAttribute("aria-label", infoVisible ? "Hide description" : "Show description");
      });
      const updateState = () => {
        const s = states[p.name];
        stateBtn.textContent = s === "single" ? "\u2713" : s === "combined" ? "\u25CE" : "";
        stateBtn.style.backgroundColor = s === "single" ? "var(--background-modifier-hover)" : s === "combined" ? "var(--background-modifier-active-hover)" : "transparent";
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
    const footer = contentEl.createDiv();
    footer.style.cssText = "margin-top:16px; display:flex; align-items:center; gap:8px;";
    const clearBtn = footer.createEl("button", { text: "Clear all" });
    clearBtn.style.cssText = "margin-right:auto; opacity:0.7;";
    clearBtn.addEventListener("click", () => {
      this.prompts.forEach((p) => {
        states[p.name] = "off";
      });
      updateFns.forEach((fn) => fn());
    });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => {
      this.close();
      new import_obsidian.Notice("Cancelled. (C0)");
    });
    const runBtn = footer.createEl("button", { text: "Run Selected", cls: "mod-cta" });
    runBtn.addEventListener("click", () => {
      const individual = [];
      const combined = [];
      this.prompts.forEach((p) => {
        if (states[p.name] === "single")
          individual.push(p);
        else if (states[p.name] === "combined")
          combined.push(p);
      });
      this.close();
      this.onSubmit({ individual, combined }, { ...states }, currentMaxSent);
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var OllamaSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Local Ollama Settings" });
    new import_obsidian.Setting(containerEl).setName("Ollama Server URL").setDesc("Default: http://localhost:11434").addText(
      (t) => t.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaUrl).onChange(async (v) => {
        this.plugin.settings.ollamaUrl = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Ollama Model Name").setDesc("Exact model name as installed in Ollama").addText(
      (t) => t.setPlaceholder("llama3.1:8b").setValue(this.plugin.settings.ollamaModel).onChange(async (v) => {
        this.plugin.settings.ollamaModel = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Variations mode").setDesc("Each prompt returns multiple variations to choose from instead of one output.").addToggle(
      (t) => t.setValue(this.plugin.settings.variationsMode).onChange(async (v) => {
        this.plugin.settings.variationsMode = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Number of variations").setDesc("How many variants per prompt when variations mode is on. 3\u20135 recommended for local models.").addSlider(
      (s) => s.setLimits(2, 8, 1).setValue(this.plugin.settings.variationsCount).setDynamicTooltip().onChange(async (v) => {
        this.plugin.settings.variationsCount = v;
        await this.plugin.saveSettings();
      })
    );
    const sentLimitSetting = new import_obsidian.Setting(containerEl).setName("Default output sentence limit").setDesc("Maximum sentences per AI output. 0 = unlimited. Can also be adjusted per-run in the prompt menu.");
    const sentLimitDisplay = sentLimitSetting.nameEl.createEl("span");
    sentLimitDisplay.style.cssText = "margin-left:0.75em; font-size:0.85em; font-weight:600; color:var(--text-muted);";
    const refreshDisplay = (v) => {
      sentLimitDisplay.textContent = v === 0 ? "(Unlimited)" : `(Max ${v})`;
    };
    refreshDisplay(this.plugin.settings.maxOutputSentences);
    sentLimitSetting.addSlider(
      (s) => s.setLimits(0, 20, 1).setValue(this.plugin.settings.maxOutputSentences).setDynamicTooltip().onChange(async (v) => {
        this.plugin.settings.maxOutputSentences = v;
        refreshDisplay(v);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Custom Prompts").setDesc('One per line \u2014 format: "Menu Name | Prompt text []". The [] is replaced by your selected/detected text.').addTextArea((t) => {
      t.setPlaceholder("Summarize | Summarize this text: []").setValue(this.plugin.settings.customPrompts).onChange(async (v) => {
        this.plugin.settings.customPrompts = v;
        await this.plugin.saveSettings();
      });
      t.inputEl.rows = 10;
      t.inputEl.cols = 52;
      t.inputEl.style.fontFamily = "monospace";
      t.inputEl.style.fontSize = "0.85em";
    });
    new import_obsidian.Setting(containerEl).setName("Reset remembered prompt selections").setDesc("Clears which prompts were last selected in the AI menu.").addButton(
      (b) => b.setButtonText("Reset").setWarning().onClick(async () => {
        this.plugin.settings.promptStates = {};
        await this.plugin.saveSettings();
        new import_obsidian.Notice("Prompt selections cleared.");
      })
    );
  }
};
