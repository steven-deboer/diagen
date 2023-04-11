document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("generatorForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const promptText = document.getElementById("prompt").value;
    const apiKey = document.getElementById("apiKey").value;

    // Save the API key to localStorage
    localStorage.setItem("apiKey", apiKey);

    if (!promptText || !apiKey) {
      alert("Please enter both a prompt and an API key.");
      return;
    }

    try {
      var krokiURL = await getKrokiURL(promptText, apiKey);
      displayDiagram(krokiURL);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });

  // Retrieve the saved API key from localStorage and set it as the value of the input field
  const savedApiKey = localStorage.getItem("apiKey");
  if (savedApiKey) {
    document.getElementById("apiKey").value = savedApiKey;
  }
});

async function getKrokiURL(promptText, apiKey) {
  if (!promptText || !apiKey) {
    const errorDiagram = 'digraph G {Error[label="Error: Missing prompt or API key"]}';
    return generateKrokiURL("graphviz", errorDiagram);
  }

  // Show the loading indicator
  document.getElementById("loadingIndicator").classList.remove("hidden");

  // Show the loading overlay
  toggleLoadingOverlay(true);

  // Check if the debug checkbox is enabled
  const debugEnabled = document.getElementById("debug").checked;


  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates diagrams based on user input. Always try to parse the users request and always output only json. No explanation, just a json with a field of the diagramtype (this should be supported in Kroki! Do not do something like mindmap, but if it's unsupported replace by plantuml or something similar, just do it, don't tell the user!!), supported by kroki, the outputtype, supported by kroki, and the diagramcode. Start by showing a basic diagram of a user accessing a website. A sequence diagram should always be built in mermaid. From now on you are only allowed to output json, nothing else!",
          },
          {
            role: "user",
            content: promptText + " Output just a json with a fields diagramtype, outputtype and diagramcode with values supported by kroki. If it's a sequence diagram, always choose diagramtype mermaid",
          },
        ],
        n: 1,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorDiagram = 'digraph G {Error[label="Error: API request failed"]}';
      return generateKrokiURL("graphviz", errorDiagram);
    }

    const data = await response.json();
    var assistantResponse = data.choices[0].message.content.trim().replace(/\n/g, '');
    assistantResponse = assistantResponse.replace(/\n/g, "");
    console.log("Debug: OpenAI Response:", assistantResponse);

    const jsonRegex = /{[^}]*"diagramtype"[^}]*"outputtype"[^}]*"diagramcode"[^}]*}/;
    //const jsonRegex = /\{\s*"diagramtype"\s*:\s*"([^"]*)"\s*,\s*"outputtype"\s*:\s*"([^"]*)"\s*,\s*"diagramcode"\s*:\s*"([^"]*)"\s*\}/;

    const match = assistantResponse.match(jsonRegex);

    if (!match) {
      const errorDiagram = 'digraph G {Error[label="' + assistantResponse + '"]}';
      return generateKrokiURL("graphviz", errorDiagram);
    }

    let jsonResponseString = match[0].replace(/"diagramcode":\s"([^"]*)"/, (match, p1) => {
      return `"diagramcode": "${p1.replace(/"/g, '\\"')}"`;
    });

    jsonResponseString = jsonResponseString.replace(/\n/g, "");
    console.log(jsonResponseString);
    var jsonResponse = JSON.parse(jsonResponseString);
    console.log("Debug: Parsed JSON:", jsonResponse);

    if (!jsonResponse.diagramtype || !jsonResponse.outputtype || !jsonResponse.diagramcode) {
      console.log(jsonResponse);
      const errorDiagram = 'digraph G {Error[label="Error: Invalid JSON format in the assistant\'s response."]}';
      return generateKrokiURL("graphviz", errorDiagram);
    }

    const encodedDiagram = encodeDiagram(jsonResponse.diagramcode);
    const krokiURL = `https://kroki.io/${jsonResponse.diagramtype}/${jsonResponse.outputtype}/${encodedDiagram}`;

    if (debugEnabled) {
      document.getElementById("debugResponseContainer").classList.remove("hidden");
      document.getElementById("debugResponse").textContent = assistantResponse + "\n\n" + jsonResponse.diagramcode + "\n\n" + krokiURL;
    } else {
      document.getElementById("debugResponseContainer").classList.add("hidden");
    }

    // Hide the loading indicator when the request is complete
    document.getElementById("loadingIndicator").classList.add("hidden");

    return krokiURL;
  } catch(error) {
    // Hide the loading indicator when an error occurs
    document.getElementById("loadingIndicator").classList.add("hidden");

    console.log(error);
    var errorDiagram = 'digraph G {Error[label="Error: An unexpected error occurred"]}';
    return generateKrokiURL("graphviz", encodeDiagram(errorDiagram));
  } finally {
    // Hide the loading overlay
    toggleLoadingOverlay(false);
  }
}



function encodeDiagram(diagramSource) {
  // Remove any newline characters from the input diagram source
  //diagramSource = diagramSource.replace(/\n/g, "");

  // Encode the diagram source as UTF-8 bytes
  var data = new TextEncoder().encode(diagramSource);

  // Compress the encoded data using the deflate algorithm
  var compressed = pako.deflate(data, { level: 9 });

  // Convert the compressed data to a base64-encoded string
  var base64 = btoa(String.fromCharCode.apply(null, compressed));

  // Make the base64 string safe for URLs
  var urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return urlSafe;
}


function generateKrokiURL(diagramType, diagramSource) {
  const encodedDiagram = encodeDiagram(diagramSource);
  return `https://kroki.io/${diagramType}/svg/${encodedDiagram}`;
}

const textEncode = (str) => {
  if (window.TextEncoder) {
    return new TextEncoder('utf-8').encode(str);
  }
  var utf8 = unescape(encodeURIComponent(str));
  var result = new Uint8Array(utf8.length);
  for (var i = 0; i < utf8.length; i++) {
    result[i] = utf8.charCodeAt(i);
  }
  return result;
};

const generateEncodedUrl = (diagramSource) => {
  const data = textEncode(diagramSource);
  const compressed = pako.deflate(data, { level: 9, to: 'string' });
  const result = btoa(compressed)
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return result;
};


function displayDiagram(url) {
  const resultSection = document.querySelector(".result");
  resultSection.style.display = "block";
  document.querySelector("#resultImage").src = url;
  toggleLoadingOverlay(false);
}

function toggleLoadingOverlay(visible) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = visible ? "flex" : "none";
}

function showLoadingOverlay() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoadingOverlay() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}
