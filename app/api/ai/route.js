export async function POST(req) {
  try {
    const { prompt } = await req.json();

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "deepseek-coder",
        prompt: `You are FlowCode, an expert AI developer. Structure responses with headings, explanation and code.\n${prompt}`,
        stream: false,
      }),
    });

    const data = await res.json();

    return Response.json({ response: data.response });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}