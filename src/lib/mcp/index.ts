import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCategoriesTool from "./tools/list-categories";
import listQuestionsTool from "./tools/list-questions";
import getMyProfileTool from "./tools/get-my-profile";
import getMyProgressTool from "./tools/get-my-progress";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "trivia-battle",
  title: "Trivia Battle",
  version: "0.1.0",
  instructions:
    "Tools for Trivia Battle. Browse trivia categories and questions, and read the signed-in player's profile and per-category progress.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCategoriesTool, listQuestionsTool, getMyProfileTool, getMyProgressTool],
});
