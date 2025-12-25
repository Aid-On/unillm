/**
 * Test unilmp streaming functionality
 */

import { unilmp } from "../src/fluent.js";

async function testGroqStreaming() {
  console.log("🔍 Testing Groq streaming...\n");
  
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error("❌ GROQ_API_KEY not found in environment");
    return;
  }

  try {
    const stream = await unilmp()
      .model("groq:llama-3.1-8b-instant")
      .credentials({ groqApiKey: groqKey })
      .system("You are a helpful assistant. Be concise.")
      .stream("Say 'Hello World' in Japanese");

    let fullText = "";
    let chunkCount = 0;
    
    console.log("📝 Response chunks:");
    for await (const chunk of stream) {
      process.stdout.write(chunk);
      fullText += chunk;
      chunkCount++;
    }
    
    console.log("\n");
    console.log(`✅ Groq streaming completed with ${chunkCount} chunks`);
    console.log(`📏 Total length: ${fullText.length} characters`);
    
  } catch (error) {
    console.error("❌ Groq streaming error:", error);
  }
}

async function testGeminiStreaming() {
  console.log("\n🔍 Testing Gemini streaming...\n");
  
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    return;
  }

  try {
    const stream = await unilmp()
      .model("gemini:gemini-2.0-flash")
      .credentials({ geminiApiKey: geminiKey })
      .system("You are a helpful assistant. Be concise.")
      .stream("Say 'Hello World' in Japanese");

    let fullText = "";
    let chunkCount = 0;
    
    console.log("📝 Response chunks:");
    for await (const chunk of stream) {
      process.stdout.write(chunk);
      fullText += chunk;
      chunkCount++;
    }
    
    console.log("\n");
    console.log(`✅ Gemini streaming completed with ${chunkCount} chunks`);
    console.log(`📏 Total length: ${fullText.length} characters`);
    
  } catch (error) {
    console.error("❌ Gemini streaming error:", error);
  }
}

async function main() {
  console.log("🚀 Testing unilmp streaming implementation\n");
  console.log("=" .repeat(50));
  
  await testGroqStreaming();
  await testGeminiStreaming();
  
  console.log("\n" + "=" .repeat(50));
  console.log("✨ All tests completed");
}

main().catch(console.error);