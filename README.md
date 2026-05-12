# Obsidian-AI-Text-Processor

Lets you use local LLMs in your Obsidian Vault; edit your stories line by line, or create entirely new prediction texts based on context.

<img width="422" height="514" alt="Sample_Process" src="https://github.com/user-attachments/assets/f444d8f1-685e-4e94-994e-8eb716f447ba" />

<img width="316" height="292" alt="Sample_Prediction" src="https://github.com/user-attachments/assets/56710e07-0f87-4e42-a56e-6e9dc2217cad" />

This plugin was developed to make an intuitive writing and editing experience with Local LLM models, all within Obsidian.

## Usage Instructions

Clone the plugin into your plugins folder.

```

cd ./obsidian/plugins
git clone https://github.com/setadpu/Obsidian-AI-Text-Processor.git
cd Obsidian-AI-Text-Processor
npm install
npm run build

```

Ensure that you have Ollama installed.

```

https://ollama.com/download

```


Ensure that the Ollama model you want to use is running in the background.

```

ollama run llama3.2

(Example)

```

If you downloaded this plugin from GitHub, copy it to your .obsidian/plugins, don't forget to run npm install within the plugins directory (if Powershell is giving you a hard time, use Command Prompt).

```

npm install
npm run build


```

Once you have successfuly installed:

-   Ensure that the plugin is activated.
-   Set your keybind for quick usage.
-   Choose the right endpoint and model in plugins settings.

<img width="688" height="509" alt="PluginSettings" src="https://github.com/user-attachments/assets/d0265146-429f-4505-a2b0-e6f8ce5bb472" />

  
-   Select the text with your mouse.
-   Right click after highlighting of text (or text cursor positioned inside the sentence) and choose process text.
-   Select custom prompt checkboxes, one click for individual ai response, two clicks for combined prompt response.
-   Press Run Selected to confirm.
-   Wait for a while (depending on the model and your specifications) to get the result.

An overlay with replacement options (text from LLM) will be available.

### Recommendation

Use https://www.canirun.ai/ to determine which AI model is best for you, (Aim for at least 60-80 token/s).
