import { headers } from "next/headers";

export const REQUEST_USER_ID_HEADER = "x-sharehima-user-id";

export async function getRequestUserId() {
  const requestHeaders = await headers();
  return requestHeaders.get(REQUEST_USER_ID_HEADER);
}
