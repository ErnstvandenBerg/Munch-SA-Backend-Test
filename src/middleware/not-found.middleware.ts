import { Request, Response, NextFunction } from "express";
import fs from 'fs'
const notFoundPage = fs.readFileSync('html/404.html', 'utf-8')
// middleware to handle 404
export const notFoundHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => {

  const message = "Resource not found";

  response.status(404).send(notFoundPage)

};