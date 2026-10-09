import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { redecide } from "../lib/pipeline/redecide";

/** Re-applies the decision engine, personal context and sender preferences to every stored analysis. No OpenAI calls. */
redecide()
  .then(({ total, changed }) => console.log(`Re-decided ${total} communications; ${changed} changed level.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
