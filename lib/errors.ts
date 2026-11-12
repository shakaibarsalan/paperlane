export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "error",
  ) {
    super(message);
  }
}
export const notFound = (what = "Document") => new AppError(404, `${what} not found`, "not_found");
export const forbidden = (msg = "You don't have access to do that") => new AppError(403, msg, "forbidden");
export const badRequest = (msg: string) => new AppError(400, msg, "bad_request");
