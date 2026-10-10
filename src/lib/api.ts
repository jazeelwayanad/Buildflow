import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "./auth";

export function api(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, "Cross-origin changes are not allowed");
      }
      return await handler(request);
    } catch (error) {
      if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError || error instanceof SyntaxError) return Response.json({ error: "Invalid request data" }, { status: 400 });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "This record already exists" }, { status: 409 });
      console.error("Database request failed", error instanceof Error ? error.name : "UnknownError");
      return Response.json({ error: "Unable to complete the request. Check the database connection." }, { status: 503 });
    }
  };
}
