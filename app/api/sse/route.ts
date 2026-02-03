import { addSSEConnection, removeSSEConnection } from '../activities/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Register this connection with the activities system
      addSSEConnection(controller);
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      
      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
        } catch (error) {
          console.error('Heartbeat failed:', error);
          clearInterval(heartbeat);
        }
      }, 30000);
      
      // Cleanup on close
      return () => {
        clearInterval(heartbeat);
        removeSSEConnection(controller);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
