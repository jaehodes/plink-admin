// app/api/alive/route.ts
export async function GET() {
  return new Response("ok", { status: 200 });
}
