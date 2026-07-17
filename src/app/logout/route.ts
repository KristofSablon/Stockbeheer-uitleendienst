import { NextResponse } from "next/server";
import { afmelden } from "@/lib/auth";

export async function GET(request: Request) {
  await afmelden();
  return NextResponse.redirect(new URL("/", request.url));
}
