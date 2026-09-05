import { Router } from "express";
import Retell from "retell-sdk";

export function createRetellCallsRouter(apiKey: string): Router {
  const router = Router();
  const retell = new Retell({ apiKey });

  router.get("/", async (req, res, next) => {
    try {
      const requestedLimit = Number(req.query.limit) || 20;
      const limit = Math.min(Math.max(requestedLimit, 1), 100);

      const result = await retell.call.list({
        sort_order: "descending",
        limit
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:callId", async (req, res, next) => {
    try {
      const { callId } = req.params;

      if (!callId) {
        res.status(400).json({ error: "Call ID is required" });
        return;
      }

      const call = await retell.call.retrieve(callId);
      res.json(call);
    } catch (error) {
      next(error);
    }
  });

  return router;
}