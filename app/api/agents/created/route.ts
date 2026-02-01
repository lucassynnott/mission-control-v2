import { NextResponse } from "next/server";

// Dynamic import to avoid build-time Supabase initialization
async function getSupabase() {
  const { supabase } = await import("@/lib/supabase");
  return supabase;
}

// This endpoint receives the callback from Claws after agent creation
export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    
    // Validate the payload from Claws
    const {
      requestId,
      name,
      avatar,
      status,
      workspacePath,
      sessionKey,
      error,
    } = body;

    if (error) {
      console.error("Agent creation failed:", error);
      
      // Update request status to failed
      await supabase
        .from("agent_requests")
        .update({ status: "failed", error, updated_at: new Date().toISOString() })
        .eq("request_id", requestId);
      
      return NextResponse.json({ success: false, error });
    }

    // Insert the new agent into the agents table
    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        name,
        avatar: avatar || "🤖",
        status: status || "idle",
        session_key: sessionKey,
        workspace_path: workspacePath,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert agent:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Update the request status to completed
    await supabase
      .from("agent_requests")
      .update({
        status: "completed",
        agent_id: agent.id,
        completed_at: new Date().toISOString(),
      })
      .eq("request_id", requestId);

    // Broadcast to activity feed
    await supabase.from("activities").insert({
      type: "agent",
      message: `Agent "${name}" created successfully`,
      agent: "System",
      metadata: { agentId: agent.id, agentName: name },
    });

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      message: "Agent created successfully",
    });
  } catch (error) {
    console.error("Error in agent created webhook:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
