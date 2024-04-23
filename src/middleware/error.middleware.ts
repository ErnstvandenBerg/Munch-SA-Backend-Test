import HttpException from "../common/http-exception";
import { Request, Response, NextFunction } from "express";
// middleware to handle network exceptions
export const errorHandler = (
  error: HttpException,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const status = error.statusCode || error.status || 500;

  response.status(status).send(error);
};