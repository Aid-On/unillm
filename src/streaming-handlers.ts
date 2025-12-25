/**
 * Model-specific streaming handlers
 * 
 * Each model has unique streaming characteristics that need individual attention.
 * This file provides dedicated handlers for each model to ensure reliable streaming.
 */

// Use global ReadableStream for edge compatibility

// =============================================================================
// Model-Specific Stream Handlers
// =============================================================================

export interface StreamHandler {
  model: string;
  createStream: (
    messages: Array<{ role: string; content: string }>,
    apiKey: string,
    options?: StreamOptions
  ) => Promise<ReadableStream<string>>;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[] | null;
}

// =============================================================================
// GPT-OSS Models (OpenAI Open Source on Groq)
// =============================================================================

/**
 * GPT-OSS-120B specific handler
 * This model needs special care for long outputs and may stop early
 */
export const gptOss120bHandler: StreamHandler = {
  model: 'openai/gpt-oss-120b',
  async createStream(messages, apiKey, options = {}) {
    console.log('[gpt-oss-120b] Starting stream with messages:', messages.length);
    
    // GPT-OSS-120B specific parameters
    const requestBody = {
      model: 'openai/gpt-oss-120b',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 8192, // Higher limit for GPT-OSS
      top_p: options.topP ?? 1.0,
      frequency_penalty: 0,
      presence_penalty: 0,
      // GPT-OSS specific: no stop sequences by default to avoid early termination
      stop: options.stopSequences === undefined ? [] : options.stopSequences,
      // Add n=1 to ensure single response
      n: 1,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[gpt-oss-120b] API error:', response.status, errorText);
      throw new Error(`GPT-OSS-120B streaming failed: ${response.status}`);
    }

    let buffer = '';
    let totalChunks = 0;
    let totalContent = '';

    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              console.log(`[gpt-oss-120b] Stream complete. Total chunks: ${totalChunks}, Total length: ${totalContent.length}`);
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                totalChunks++;
                totalContent += content;
                controller.enqueue(content);
                
                // Log progress for debugging
                if (totalChunks % 10 === 0) {
                  console.log(`[gpt-oss-120b] Progress: ${totalChunks} chunks, ${totalContent.length} chars`);
                }
              }
            } catch (e) {
              console.warn('[gpt-oss-120b] Parse error:', e, 'Data:', data.substring(0, 100));
            }
          }
        },
        
        flush(controller) {
          if (buffer.trim()) {
            console.log('[gpt-oss-120b] Processing remaining buffer:', buffer.substring(0, 100));
            // Try to process any remaining data
            if (buffer.trim().startsWith('data: ')) {
              const data = buffer.trim().slice(6);
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(content);
                  }
                } catch (e) {
                  // Ignore incomplete chunk
                }
              }
            }
          }
          console.log(`[gpt-oss-120b] Final stats: ${totalChunks} chunks, ${totalContent.length} chars total`);
        }
      }));
  }
};

/**
 * GPT-OSS-20B specific handler
 */
export const gptOss20bHandler: StreamHandler = {
  model: 'openai/gpt-oss-20b',
  async createStream(messages, apiKey, options = {}) {
    console.log('[gpt-oss-20b] Starting stream');
    
    const requestBody = {
      model: 'openai/gpt-oss-20b',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1.0,
      stop: options.stopSequences === undefined ? [] : options.stopSequences,
      n: 1,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GPT-OSS-20B streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }));
  }
};

// =============================================================================
// Llama Models
// =============================================================================

/**
 * Llama 3.1 8B Instant handler
 */
export const llama31InstantHandler: StreamHandler = {
  model: 'llama-3.1-8b-instant',
  async createStream(messages, apiKey, options = {}) {
    console.log('[llama-3.1-8b] Starting stream');
    
    const requestBody = {
      model: 'llama-3.1-8b-instant',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      // Llama models work better without top_p
      // stop sequences can be customized
      stop: options.stopSequences,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Llama 3.1 8B streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }));
  }
};

/**
 * Llama 3.3 70B Versatile handler
 */
export const llama33VersatileHandler: StreamHandler = {
  model: 'llama-3.3-70b-versatile',
  async createStream(messages, apiKey, options = {}) {
    console.log('[llama-3.3-70b] Starting stream');
    
    const requestBody = {
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stop: options.stopSequences,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Llama 3.3 70B streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }));
  }
};

// =============================================================================
// Gemini Models
// =============================================================================

/**
 * Gemini 2.0 Flash handler
 */
export const gemini20FlashHandler: StreamHandler = {
  model: 'gemini-2.0-flash',
  async createStream(messages, apiKey, options = {}) {
    console.log('[gemini-2.0-flash] Starting stream');
    
    // Convert to Gemini format
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === "system")?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
            topP: options.topP ?? 0.95,
            stopSequences: options.stopSequences,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini 2.0 Flash streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(text);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }));
  }
};

/**
 * Gemini 1.5 Flash handler
 */
export const gemini15FlashHandler: StreamHandler = {
  model: 'gemini-1.5-flash',
  async createStream(messages, apiKey, options = {}) {
    console.log('[gemini-1.5-flash] Starting stream');
    
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === "system")?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
            topP: options.topP ?? 0.95,
            stopSequences: options.stopSequences,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini 1.5 Flash streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(text);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }));
  }
};

// =============================================================================
// Handler Registry
// =============================================================================

export const STREAM_HANDLERS: Map<string, StreamHandler> = new Map([
  // GPT-OSS models
  ['openai/gpt-oss-120b', gptOss120bHandler],
  ['openai/gpt-oss-20b', gptOss20bHandler],
  
  // Llama models  
  ['llama-3.1-8b-instant', llama31InstantHandler],
  ['llama-3.3-70b-versatile', llama33VersatileHandler],
  
  // Gemini models
  ['gemini-2.0-flash', gemini20FlashHandler],
  ['gemini-1.5-flash', gemini15FlashHandler],
  ['gemini-1.5-flash-002', gemini15FlashHandler], // Alias
]);

/**
 * Get a stream handler for a specific model
 */
export function getStreamHandler(model: string): StreamHandler | undefined {
  return STREAM_HANDLERS.get(model);
}

/**
 * Check if a model has a dedicated stream handler
 */
export function hasStreamHandler(model: string): boolean {
  return STREAM_HANDLERS.has(model);
}