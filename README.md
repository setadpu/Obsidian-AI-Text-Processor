# Obsidian AI Text Processor

Ever been frustrated pasting text into ChatGPT, getting back massive blocks of text when all you wanted was an intuitive way to modify sentences on the fly?

If that sounds like you, you've come to the right place.

OATP lets you use local LLMs (Ollama) in your Obsidian Vault - edit your stories line by line, or generate entirely new prediction text based on context.

### Line-By-Line Editing
<img width="400" alt="Edit_Sample" src="https://github.com/user-attachments/assets/715c85ef-06dc-458a-b4d6-eb9a3038ddd8" />

### Predict Unfinished Sentences
<img width="400" alt="Autocomplete_Sample" src="https://github.com/user-attachments/assets/68fd3614-b61d-4300-b2c7-a39185ae0146" />

### Generate Variant Predictive Sentences
<img width="400" alt="Sample_Prediction" src="https://github.com/user-attachments/assets/56710e07-0f87-4e42-a56e-6e9dc2217cad" />

### Custom Prompts - Change to your liking.
<img width="400" alt="Sample_Process" src="https://github.com/user-attachments/assets/f444d8f1-685e-4e94-994e-8eb716f447ba" />

This plugin was developed to make an intuitive writing and editing experience with local LLM models, all within Obsidian.

## Installation

Clone the plugin into your Obsidian plugins folder:

```bash
cd .obsidian/plugins
git clone https://github.com/setadpu/Obsidian-AI-Text-Processor.git
cd Obsidian-AI-Text-Processor
npm install
npm run build
```

> **Note:** If you downloaded the ZIP from GitHub, copy the folder into `.obsidian/plugins/` manually, then run `npm install` and `npm run build` inside it. If PowerShell gives you trouble, use Command Prompt instead.

### Prerequisites

1. **Install Ollama** - https://ollama.com/download

2. **Pull and run your chosen model:**

```bash
ollama run llama3.2
```

## Usage

### Setup

1. Enable the plugin in Obsidian's **Community Plugins** settings.
2. Set a keybind for quick processing .
3. Configure your Ollama endpoint and model under **Plugin Settings**:

![PluginSettings](https://github.com/user-attachments/assets/d0265146-429f-4505-a2b0-e6f8ce5bb472)

### Running a Prompt

1. Highlight text with your mouse **or** position your text cursor inside a sentence.
2. Right-click and choose **Process Text** (or use your keybind if you don't want to change prompt combinations).
3. In the prompt menu, select your desired prompts:
   - **One click** - individual AI response per prompt
   - **Two clicks** - combined prompt response
4. Press **Run Selected** to confirm.
5. Wait for the model to respond (speed depends on your hardware and model size).
6. An overlay will appear with replacement options - click the one you want or hover over them to preview it within your notes and make your decision.

### Recommendation

Use [canirun.ai](https://www.canirun.ai/) to find the best model for your hardware. Aim for at least **60–80 tokens/second** for a smooth experience.
