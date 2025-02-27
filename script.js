document.addEventListener("DOMContentLoaded", () => {
  const descriptionPage = document.getElementById("description-page");
  const mainPage = document.getElementById("main-page");
  const pulsatingGetStartedButton = document.getElementById("pulsating-get-started");
  const fileInput = document.getElementById("file-input");
  const convertButton = document.getElementById("convert");
  const textArea = document.getElementById("text-area");
  const readAloudButton = document.getElementById("read-aloud");
  const pauseAloudButton = document.getElementById("pause-aloud");
  const stopAloudButton = document.getElementById("stop-aloud");
  const clearTextButton = document.getElementById("clear-text");
  const rearrangeTextButton = document.getElementById("rearrange-text");
  const voiceSelect = document.getElementById("voice-select");
  const speedControl = document.getElementById("speed-control");
  const speedValue = document.getElementById("speed-value");

  let speech = null;
  let voices = [];
  let isSpeaking = false;
  let userInteracted = false;
  let currentWordIndex = -1;
  let words = [];

  // Highlight Element
  const highlight = document.createElement("div");
  highlight.className = "word-highlight";
  textArea.parentNode.insertBefore(highlight, textArea.nextSibling);

  // Ensure user interaction for iOS playback
  const ensureUserInteraction = () => {
    if (!userInteracted) {
      userInteracted = true;
      const unlockSpeech = new SpeechSynthesisUtterance("");
      speechSynthesis.speak(unlockSpeech);
      speechSynthesis.cancel(); // Immediate cancel to avoid noise
    }
  };

  // Switch to main page
  pulsatingGetStartedButton.addEventListener("click", () => {
    descriptionPage.classList.add("hidden");
    mainPage.classList.remove("hidden");
    ensureUserInteraction();
  });

  // File Conversion
  convertButton.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (fileExtension === "txt") {
      const reader = new FileReader();
      reader.onload = () => (textArea.value = reader.result.trim());
      reader.readAsText(file);
    } else if (fileExtension === "pdf") {
      const reader = new FileReader();
      reader.onload = async () => {
        const typedArray = new Uint8Array(reader.result);
        try {
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let fullText = "";
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
          }
          textArea.value = fullText.trim() || "PDF converted, but no readable text found.";
        } catch (error) {
          alert("Failed to process PDF.");
          console.error("PDF error:", error);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file type. Use TXT or PDF.");
    }
  });

  // Load Voices
  const loadVoices = () => {
    voices = speechSynthesis.getVoices().filter((v) => v.lang.includes("en"));
    voiceSelect.innerHTML = "";
    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = voice.name;
      voiceSelect.appendChild(option);
    });
    const preferredVoice = voices.find((v) =>
      /Google|Microsoft|Samantha/i.test(v.name)
    );
    if (preferredVoice) voiceSelect.value = preferredVoice.name;
  };
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  // Speak Text Function
  const speakText = (text, startIndex = 0) => {
    if (!text.trim()) {
      alert("No text to read.");
      return;
    }

    ensureUserInteraction();
    speechSynthesis.cancel();

    words = text.split(/\s+/);
    const startText = startIndex ? words.slice(startIndex).join(" ") : text;
    const selectedVoice = voices.find((v) => v.name === voiceSelect.value) || voices[0];
    const speed = parseFloat(speedControl.value);

    speech = new SpeechSynthesisUtterance(startText);
    speech.voice = selectedVoice;
    speech.rate = speed;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = () => {
      isSpeaking = true;
      readAloudButton.disabled = true;
      pauseAloudButton.disabled = false;
      stopAloudButton.disabled = false;
      pauseAloudButton.textContent = "Pause";
    };

    speech.onend = () => {
      isSpeaking = false;
      currentWordIndex = -1;
      highlight.style.display = "none";
      updateButtons();
    };

    speech.onboundary = (e) => {
      if (e.name === "word") {
        currentWordIndex = startIndex + getWordIndex(e.charIndex, startText);
        highlightWord(currentWordIndex);
      }
    };

    speechSynthesis.speak(speech);
    updateButtons();
  };

  // Highlight Word
  const highlightWord = (index) => {
    if (index < 0 || index >= words.length) {
      highlight.style.display = "none";
      return;
    }
    const word = words[index];
    const textBefore = words.slice(0, index).join(" ");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = window.getComputedStyle(textArea).font;
    const width = ctx.measureText(word).width;
    const height = parseFloat(window.getComputedStyle(textArea).fontSize);
    const leftOffset = textBefore ? ctx.measureText(textBefore + " ").width : 0;
    const lineHeight = height * 1.2;
    const lineIndex = Math.floor(leftOffset / textArea.clientWidth);
    const left = leftOffset % textArea.clientWidth + 15; // Padding adjustment
    const top = lineIndex * lineHeight + 15;

    highlight.style.display = "block";
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${width}px`;
    highlight.style.height = `${height}px`;
  };

  // Get Word Index
  const getWordIndex = (charPos, text) => {
    return text.substring(0, charPos).split(/\s+/).length - 1;
  };

  // Tap-to-Play
  textArea.addEventListener("click", () => {
    if (!isSpeaking) {
      const cursorPos = textArea.selectionStart;
      const fullText = textArea.value.trim();
      words = fullText.split(/\s+/);
      const wordIndex = getWordIndex(cursorPos, fullText);
      speakText(fullText, wordIndex);
    }
  });

  // Button Listeners
  readAloudButton.addEventListener("click", () => speakText(textArea.value.trim()));
  pauseAloudButton.addEventListener("click", () => {
    if (isSpeaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      pauseAloudButton.textContent = "Resume";
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      pauseAloudButton.textContent = "Pause";
    }
  });
  stopAloudButton.addEventListener("click", () => {
    speechSynthesis.cancel();
    isSpeaking = false;
    currentWordIndex = -1;
    highlight.style.display = "none";
    updateButtons();
  });
  clearTextButton.addEventListener("click", () => {
    textArea.value = "";
    fileInput.value = "";
    speechSynthesis.cancel();
    isSpeaking = false;
    highlight.style.display = "none";
    updateButtons();
  });

  // AI Enhance (Basic Implementation)
  rearrangeTextButton.addEventListener("click", () => {
    let text = textArea.value.trim();
    if (!text) {
      alert("No text to enhance.");
      return;
    }
    // Basic enhancement: capitalize sentences, remove extra spaces
    text = text
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(^\w|\.\s+\w)/g, (c) => c.toUpperCase());
    // Add simple grammar fix (e.g., ensure periods)
    text = text.replace(/([a-z])\s+([A-Z])/g, "$1. $2");
    textArea.value = text;
    alert("Text enhanced!");
    // Note: For advanced AI, integrate an API like Grammarly or a custom NLP model
  });

  // Speed Control
  speedControl.addEventListener("input", () => {
    speedValue.textContent = speedControl.value;
  });

  // Update Button States
  const updateButtons = () => {
    readAloudButton.disabled = isSpeaking;
    pauseAloudButton.disabled = !isSpeaking && !speechSynthesis.paused;
    stopAloudButton.disabled = !isSpeaking && !speechSynthesis.paused;
  };

  // iPhone Compatibility Fix
  window.addEventListener("touchstart", ensureUserInteraction, { once: true });
});
