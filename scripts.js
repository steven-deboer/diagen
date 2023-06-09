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
    return generateKrokiURL("graphviz", "svg", errorDiagram);
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
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `
            You are a helpful assistant that creates diagrams as code based on user input. 

            Diagramtype should always be chosen out of the list below, even if the users asks something else. 
            In that case, make a decision to create the diagram in one of the following types:

            {
              "version": {
                "actdiag": "3.0.0",
                "bpmn": "10.3.0",
                "pikchr": "7269f78c4a",
                "nwdiag": "3.0.0",
                "c4plantuml": "1.2022.14",
                "rackdiag": "3.0.0",
                "dot": "3.0.0",
                "d2": "undefined",
                "mermaid": "9.3.0",
                "erd": "0.2.1.0",
                "graphviz": "3.0.0",
                "vegalite": "5.6.0",
                "ditaa": "1.0.3",
                "kroki": {
                  "number": "0.20.0",
                  "build_hash": "3d6f5d2"
                },
                "umlet": "15.0.0",
                "diagramsnet": "16.2.4",
                "plantuml": "1.2022.14",
                "seqdiag": "3.0.0",
                "nomnoml": "1.5.3",
                "wavedrom": "2.9.1",
                "structurizr": "1.23.0",
                "bytefield": "1.7.0",
                "wireviz": "undefined",
                "excalidraw": "undefined",
                "dbml": "1.0.26",
                "packetdiag": "3.0.0",
                "svgbob": "0.6.0",
                "vega": "5.22.1",
                "blockdiag": "3.0.0"
              },
              "status": "pass"
            }

            Respond exactly and only with json containing four fields:

            - diagramtype
            - outputtype
            - diagramcode
            - explanation (explain the diagram in max 10 sentences)

            `,
          },
          {
            role: "user",
            content: "Create a diagram as code based on this request: " + promptText + `

            If the request is to create a seqdiag, use the following example: 

            seqdiag {
              browser  -> webserver [label = "GET /seqdiag/svg/base64"];
              webserver  -> processor [label = "Convert text to image"];
              webserver <-- processor;
              browser <-- webserver;
            }

            In your response, you are only allowed to choose a diagramtype out of the list below and nothing else.
            In doubt, make a good decision to choose type out of the list below, which contains examples like actdiag,
            mermaid, vegalite.

            Always choose on of those for diagramtype.

            If you think of something else like a mindmap, choose something of the list below to create that mindmap, but
            use something of the list below for diagramtype.

            {
              "version": {
                "actdiag": "3.0.0",
                "bpmn": "10.3.0",
                "pikchr": "7269f78c4a",
                "nwdiag": "3.0.0",
                "c4plantuml": "1.2022.14",
                "rackdiag": "3.0.0",
                "dot": "3.0.0",
                "d2": "undefined",
                "mermaid": "9.3.0",
                "erd": "0.2.1.0",
                "graphviz": "3.0.0",
                "vegalite": "5.6.0",
                "ditaa": "1.0.3",
                "kroki": {
                  "number": "0.20.0",
                  "build_hash": "3d6f5d2"
                },
                "umlet": "15.0.0",
                "diagramsnet": "16.2.4",
                "plantuml": "1.2022.14",
                "seqdiag": "3.0.0",
                "nomnoml": "1.5.3",
                "wavedrom": "2.9.1",
                "structurizr": "1.23.0",
                "bytefield": "1.7.0",
                "wireviz": "undefined",
                "excalidraw": "undefined",
                "dbml": "1.0.26",
                "packetdiag": "3.0.0",
                "svgbob": "0.6.0",
                "vega": "5.22.1",
                "blockdiag": "3.0.0"
              },
              "status": "pass"
            }

            In Mermaid, do not use spaces or special characters in node names. If required, at a text in the node.

            Respond exactly and only with json containing four fields: 
            
            - diagramtype
            - outputtype
            - diagramcode
            - explanation (explain the diagram in max 10 sentences)

            If the user asks for a mindmap, e.g.: create a mind map ... always change the diagramtype to something you are allowed to.
            `,
          },
        ],
        n: 1,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorDiagram = 'digraph G {Error[label="Error: API request failed"]}';
      return generateKrokiURL("graphviz", "svg", errorDiagram);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content.trim();
    console.log("Debug information:", assistantResponse);

    try {
      const jsonResponse = JSON.parse(assistantResponse);

      // Select the HTML element where you want to display the explanation
      const explanationElement = document.getElementById("explanationText");
      
      // Check if the explanation exists in the response
      if(jsonResponse.explanation) {
          // Assign the explanation to the text content of the selected HTML element
          explanationElement.textContent = jsonResponse.explanation;
      } else {
          // If there is no explanation in the response, you can clear the previous explanation
          explanationElement.textContent = "";
      }

      if (jsonResponse.diagramtype && jsonResponse.outputtype && jsonResponse.diagramcode) {
        const imageURL = await generateKrokiURL(jsonResponse.diagramtype, jsonResponse.outputtype, jsonResponse.diagramcode);

        if (debugEnabled) {
          document.getElementById("debugResponseContainer").classList.remove("hidden");
          document.getElementById("debugResponse").textContent = assistantResponse + "\n\n" + jsonResponse.diagramcode + "\n\n" + imageURL;
        } else {
          document.getElementById("debugResponseContainer").classList.add("hidden");
        }



        // Hide the loading indicator when the request is complete
        document.getElementById("loadingIndicator").classList.add("hidden");

        return imageURL;
      } else {
        throw new Error("Invalid JSON format in the assistant's response.");
      }
    } catch (error) {
      const errorDiagram = 'digraph G {Error[label="' + assistantResponse + '"]}';
      return generateKrokiURL("graphviz", "svg", errorDiagram);
    }
  } catch (error) {
    // Hide the loading indicator when an error occurs
    document.getElementById("loadingIndicator").classList.add("hidden");

    console.log(error);
    var errorDiagram = 'digraph G {Error[label="Error: An unexpected error occurred"]}';
    return generateKrokiURL("graphviz", "svg", encodeDiagram(errorDiagram));
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


function generateKrokiURL(diagramType, outputType, diagramSource) {
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
