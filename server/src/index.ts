import { env } from "./config/env.js";
import { app } from "./app.js";
import { createHttpServer, setupSocketServer } from "./lib/socket.js";

const server = createHttpServer(app);

setupSocketServer(server);

server.listen(env.PORT, env.HOST, () => {
  console.log(`FlatBuddy API running on http://${env.HOST}:${env.PORT}`);
});
