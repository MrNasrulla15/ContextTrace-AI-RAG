const axios = require('axios');

/**
 * Candidate models ordered by stability, active quota, and sub-2-second latency.
 * gemini-3.1-flash-lite and gemini-3-flash-preview provide lightning-fast, active free-tier throughput.
 */
const CANDIDATE_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-2.5-flash'
].filter((m, i, arr) => m && arr.indexOf(m) === i);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Invokes Gemini API with JSON response enforcement, 503 demand-spike retry, and automated fallback cascade.
 * Returns parsed structured object: { answer: string, citedDocumentIds: string[], insufficientEvidence: boolean, model: string }
 */
exports.getAIResponse = async (prompt) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not configured");
    }

    let lastError = null;

    for (const model of CANDIDATE_MODELS) {
        // Allow up to 2 attempts per candidate model for transient 503 demand spikes
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {
                        contents: [
                            {
                                parts: [{ text: prompt }]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.1, // Low temperature for deterministic factual extraction
                            maxOutputTokens: 1024,
                            responseMimeType: "application/json"
                        }
                    },
                    {
                        params: {
                            key: process.env.GEMINI_API_KEY
                        },
                        headers: {
                            "Content-Type": "application/json"
                        },
                        timeout: 8000 // 8s per candidate model
                    }
                );

                const candidate = response.data?.candidates?.[0];
                const text = candidate?.content?.parts?.[0]?.text;

                if (!text) {
                    const finishReason = candidate?.finishReason || "UNKNOWN";
                    throw new Error(`Gemini (${model}) returned empty response. Finish reason: ${finishReason}`);
                }

                // Safe JSON parsing with markdown-fence fallback
                let parsed;
                try {
                    parsed = JSON.parse(text);
                } catch (parseErr) {
                    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
                    try {
                        parsed = JSON.parse(cleaned);
                    } catch (secondErr) {
                        parsed = {
                            answer: text.trim(),
                            citedDocumentIds: [],
                            insufficientEvidence: false,
                            _rawFallback: true
                        };
                    }
                }

                // Guarantee typed contract
                return {
                    answer: typeof parsed.answer === 'string' ? parsed.answer.trim() : String(parsed.answer || ''),
                    citedDocumentIds: Array.isArray(parsed.citedDocumentIds) 
                        ? parsed.citedDocumentIds.map(String).filter(Boolean) 
                        : [],
                    insufficientEvidence: Boolean(parsed.insufficientEvidence),
                    modelUsed: model
                };
            } catch (error) {
                lastError = error;
                const statusCode = error.response?.status;

                // Handle temporary 503 spike with immediate 1s backoff retry
                if (statusCode === 503 && attempt === 0) {
                    console.warn(`Gemini model '${model}' experienced transient 503 demand spike. Retrying in 1000ms...`);
                    await sleep(1000);
                    continue;
                }

                console.warn(`Gemini candidate '${model}' failed with status ${statusCode || error.code || 'ERR'}: ${error.response?.data?.error?.message || error.message}. Attempting next model...`);
                // Move on to next candidate model
                break;
            }
        }
    }

    console.error("All Gemini candidate models exhausted:", lastError?.response?.data || lastError?.message);
    throw lastError || new Error("All candidate Gemini models failed to generate response.");
};