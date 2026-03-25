export async function POST(req) {
  try {
    const { prompt } = await req.json();

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
        prompt: `You are an expert senior developer. 
Your task is to write clean, complete, and production-ready code based on the user's request.

STRICT RULES:
1. NEVER use comments in your code. Zero comments allowed.
2. ALWAYS provide the full, complete implementation. Do not truncate or use placeholders.
3. Ensure perfectly exact indentation.
4. Keep your explanations outside the code blocks extremely brief and professional.

User Request:
${prompt}`,
        stream: true,
        options: {
          num_predict: -1,
          temperature: 0.1
        }
      }),
    });

    // Pass the stream directly back to the client
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Generation Error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}