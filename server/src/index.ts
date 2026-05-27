import { env } from "./config/env.js";
import { app } from "./app.js";
import { ensureCitiesSeeded } from "./lib/ensure-cities.js";
import { createHttpServer, setupSocketServer } from "./lib/socket.js";

const server = createHttpServer(app);

setupSocketServer(server);

try {
  await ensureCitiesSeeded();

  server.listen(env.PORT, env.HOST, () => {
    console.log(`FlatBuddy API running on http://${env.HOST}:${env.PORT}`);
  });
} catch (error) {
  console.error("Unable to start FlatBuddy API.", error);
  process.exit(1);
}
