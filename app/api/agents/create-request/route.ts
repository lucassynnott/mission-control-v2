import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.modelProvider || !body.model) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate request ID
    const requestId = crypto.randomUUID();

    // Forward to Claws webhook
    const webhookUrl = process.env.CLAWS_WEBHOOK_URL || "http://localhost:3001/api/agents/create";
    
    const webhookPayload = {
      requestId,
      name: body.name,
      avatar: body.avatar || "🤖",
      personality: body.personality || "Helpful AI assistant",
      responsibilities: body.abilities || [],
      abilities: body.abilities || [],
      modelProvider: body.modelProvider,
      model: body.model,
      timestamp: new Date().toISOString(),
    };

    // Send to Claws (don't wait for response, it's async)
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => {
      console.error("Failed to notify Claws:", err);
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: "Agent creation request sent to Claws",
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
