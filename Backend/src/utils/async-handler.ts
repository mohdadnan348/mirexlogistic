import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AsyncRequestHandler<
  Req extends Request = Request,
  Res extends Response = Response,
> = (
  request: Req,
  response: Res,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<
  Req extends Request = Request,
  Res extends Response = Response,
>(
  handler: AsyncRequestHandler<Req, Res>,
): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request as Req, response as Res, next)).catch(next);
  };
}

export function asyncHandlerWithNext(
  handler: (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    handler(request, response, next).catch(next);
  };
}