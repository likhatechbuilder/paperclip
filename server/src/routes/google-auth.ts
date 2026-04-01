import { Router } from "express";
import { google } from "googleapis";
import { type Db } from "@paperclipai/db";
import { secretService } from "../services/secrets.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { SECRET_PROVIDERS, type SecretProvider } from "@paperclipai/shared";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import crypto from "node:crypto";

// Ensure environment variables exist for Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3100/api/google-auth/callback";

// In-memory store for states (in a real app, use Redis or DB)
const stateStore = new Map<string, { companyId: string, userId: string, expiresAt: number }>();

export function googleAuthRoutes(db: Db) {
  const router = Router();
  const svc = secretService(db);

  const configuredDefaultProvider = process.env.PAPERCLIP_SECRETS_PROVIDER;
  const defaultProvider = (
    configuredDefaultProvider && SECRET_PROVIDERS.includes(configuredDefaultProvider as SecretProvider)
      ? configuredDefaultProvider
      : "local_encrypted"
  ) as SecretProvider;

  // Endpoint to start the Google OAuth flow
  router.get("/companies/:companyId/google-auth/start", (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ];

    // Generate secure state
    const stateId = crypto.randomBytes(32).toString('hex');
    stateStore.set(stateId, {
      companyId,
      userId: req.actor.userId ?? "board",
      expiresAt: Date.now() + 1000 * 60 * 10 // 10 minutes
    });

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: stateId,
    });

    res.redirect(url);
  });

  // Callback endpoint that Google will redirect to
  router.get("/google-auth/callback", async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      res.status(400).send(`Google OAuth Error: ${error}`);
      return;
    }

    if (!code || !state || typeof state !== "string") {
      res.status(400).send("Missing code or state in callback.");
      return;
    }

    const stateData = stateStore.get(state);
    if (!stateData) {
      res.status(400).send("Invalid or expired state parameter.");
      return;
    }

    if (Date.now() > stateData.expiresAt) {
      stateStore.delete(state);
      res.status(400).send("State parameter expired.");
      return;
    }

    stateStore.delete(state);
    const { companyId, userId } = stateData;

    // We don't check req.actor here because it's a browser redirect,
    // so it might not have the Bearer token header. The state token validates
    // who initiated the request.

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    try {
      const { tokens } = await oauth2Client.getToken(code as string);

      if (tokens.access_token) {
        await svc.create(
          companyId,
          {
            name: "GOOGLE_ACCESS_TOKEN",
            provider: defaultProvider,
            value: tokens.access_token,
            description: "Google Access Token for Gmail Integration",
            externalRef: null,
          },
          { userId, agentId: null }
        );
      }

      if (tokens.refresh_token) {
        await svc.create(
          companyId,
          {
            name: "GOOGLE_REFRESH_TOKEN",
            provider: defaultProvider,
            value: tokens.refresh_token,
            description: "Google Refresh Token for Gmail Integration",
            externalRef: null,
          },
          { userId, agentId: null }
        );
      }

      // Redirect back to the company settings page
      res.redirect(`/${companyId}/settings/integrations`);
    } catch (err) {
      console.error("Error exchanging code for tokens", err);
      res.status(500).send("Failed to exchange code for tokens.");
    }
  });

  return router;
}
