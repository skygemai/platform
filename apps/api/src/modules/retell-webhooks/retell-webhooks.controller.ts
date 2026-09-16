import type { NextFunction, Request, Response } from "express";
import { Retell } from "retell-sdk";
import { ZodError } from "zod";
import type { RetellWebhooksService } from "./retell-webhooks.service.js";

export class RetellWebhooksController {
  constructor(
    private readonly service: RetellWebhooksService,
    private readonly apiKey: string
  ) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    if (!Buffer.isBuffer(request.body)) {
      response.status(415).json({ error: "Expected an application/json request body" });
      return;
    }

    const signature = request.header("x-retell-signature");
    const rawBody = request.body.toString("utf8");

    try {
      if (!signature || !(await Retell.verify(rawBody, this.apiKey, signature))) {
        response.status(401).json({ error: "Invalid Retell signature" });
        return;
      }

      const result = await this.service.handle(JSON.parse(rawBody) as unknown);

      // Never log the webhook body, transcript, phone numbers, or analysis.
      if (result.status === "unknown_agent") {
        console.warn("Ignored Retell webhook for unknown agent", {
          externalCallId: result.externalCallId,
          retellAgentId: result.retellAgentId
        });
      }

      response.status(204).send();
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        response.status(400).json({ error: "Invalid Retell webhook payload" });
        return;
      }
      next(error);
    }
  };
}
