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

  // Ensure user interaction for iOS playback
  const ensureUserInteraction = () => {
    if (!userInteracted) {
      userInteracted = true;
      const unlockSpeech = new SpeechSynthesisUtterance("");
      speechSynthesis.speak(unlockSpeech);
    }
  };

  // Switch to main page when "Get Started" is clicked
  pulsatingGetStartedButton.addEventListener("click", () => {
    descriptionPage.classList.add("hidden");
    mainPage.classList.remove("hidden");
    ensureUserInteraction();
  });

  // Optimized PDF and TXT Conversion
  convertButton.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (fileExtension === "txt") {
      const reader = new FileReader();
      reader.onload = () => {
        textArea.value = reader.result.trim();
      };
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
            const pageText = textContent.items.map((item) => item.str).join(" ");
            fullText += pageText + "\n";
          }
          textArea.value = fullText.trim();

          if (!fullText.trim()) {
            alert("PDF converted, but no readable text was found.");
          }
        } catch (error) {
          alert("Failed to process PDF. Please try another file.");
          console.error("PDF processing error:", error);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file type. Please upload a TXT or PDF file.");
    }
  });

  // Improved voice loading (Fix for voices not appearing)
  const loadVoices = () => {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";
    voices.forEach((voice) => {
      if (voice.lang.includes("en")) {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = voice.name;
        voiceSelect.appendChild(option);
      }
    });

    if (voices.length === 0) {
      console.error("No voices loaded. Try reloading the page.");
    }

    // Automatically select a Google/Microsoft/Siri voice if available
    const preferredVoices = voices.filter((v) =>
      v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Samantha")
    );
    if (preferredVoices.length > 0) {
      voiceSelect.value = preferredVoices[0].name;
    }
  };

  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  // Function to speak the text
  const speakText = (text) => {
    if (!text.trim()) {
      alert("No text to read.");
      return;
    }

    ensureUserInteraction();
    speechSynthesis.cancel(); // Cancel any ongoing speech

    const selectedVoice = voices.find((voice) => voice.name === voiceSelect.value);
    const speed = parseFloat(speedControl.value);

    speech = new SpeechSynthesisUtterance(text);
    speech.voice = selectedVoice || voices[0]; // Fallback to first voice
    speech.rate = speed;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = () => {
      isSpeaking = true;
      pauseAloudButton.disabled = false;
      stopAloudButton.disabled = false;
      pauseAloudButton.textContent = "Pause";
    };

    speech.onend = () => {
      isSpeaking = false;
      pauseAloudButton.disabled = true;
      stopAloudButton.disabled = true;
      pauseAloudButton.textContent = "Pause";
    };

    speechSynthesis.speak(speech);
  };

  // Read the text aloud
  readAloudButton.addEventListener("click", () => {
    const text = textArea.value.trim();
    speakText(text);
  });

  // Pause or resume text-to-speech
  pauseAloudButton.addEventListener("click", () => {
    if (isSpeaking) {
      speechSynthesis.pause();
      pauseAloudButton.textContent = "Resume";
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      pauseAloudButton.textContent = "Pause";
    }
  });

  // Stop text-to-speech
  stopAloudButton.addEventListener("click", () => {
    speechSynthesis.cancel();
    isSpeaking = false;
  });

  // Clear text area
  clearTextButton.addEventListener("click", () => {
    textArea.value = "";
    fileInput.value = "";
    speechSynthesis.cancel();
  });

  // Display speed value
  speedControl.addEventListener("input", () => {
    speedValue.textContent = speedControl.value;
  });

  // AI Rearrange Feature (NLP-based)
  rearrangeTextButton.addEventListener("click", () => {
    let text = textArea.value.trim();
    if (!text) {
      alert("No text to rearrange.");
      return;
    }

    fetch("https://api.text-processing.com/rearrange", {  // Replace with actual NLP API
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: text })
    })
    .then(response => response.json())
    .then(data => {
      if (data.rearranged_text) {
        textArea.value = data.rearranged_text;
      } else {
        alert("Failed to rearrange text.");
      }
    })
    .catch(error => {
      console.error("AI rearrange error:", error);
      alert("AI rearrange feature is temporarily unavailable.");
    });
  });

});
