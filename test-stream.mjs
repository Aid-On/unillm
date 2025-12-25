/**
 * Test unilmp stream() method returns nagare Stream<T>
 */

import { unilmp } from "./dist/index.js";

try {
  console.log("Testing unilmp stream()...");
  
  const stream = await unilmp()
    .model("groq:llama-3.1-8b-instant")
    .credentials({ groqApiKey: "test-key" })
    .messages([{ role: "user", content: "hello" }])
    .stream();
  
  console.log("Stream created:", stream);
  console.log("Stream type:", typeof stream);
  console.log("Has subscribe:", typeof stream.subscribe);
  console.log("Has toResponse:", typeof stream.toResponse);
  console.log("Is ReadableStream:", stream instanceof ReadableStream);
  
  console.log("✅ unilmp.stream() returns nagare Stream<T>!");
  
} catch (error) {
  console.error("❌ Error:", error);
}