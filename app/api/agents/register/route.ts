import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.role) {
      return NextResponse.json(
        { success: false, error: "Name and role are required" },
        { status: 400 }
      );
    }

    // Generate unique session key
    const sessionKey = `agent:${body.name.toLowerCase().replace(/\s+/g, '-')}:${Math.random().toString(36).substr(2, 9)}`;

    // Insert agent into database
    const { data: agent, error } = await supabase
      .from("agents")
      .insert({
        name: body.name,
        role: body.role,
        status: body.status || "idle",
        avatar: body.avatar || "🤖",
        session_key: sessionKey,
        model_provider: body.modelProvider || "kimi-code",
        model: body.model || "kimi-for-coding",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to register agent:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("activities").insert({
      type: "agent",
      message: `Agent "${body.name}" registered with role "${body.role}"`,
      agent: "System",
      metadata: { agentId: agent.id, agentName: body.name, role: body.role },
    });

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      sessionKey,
      message: "Agent registered successfully",
    });
  } catch (error) {
    console.error("Error in agent registration:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data: agents, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch agents:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agents: agents || [],
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
