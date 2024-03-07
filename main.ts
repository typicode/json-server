import { App } from "npm:@tinyhttp/app";
import type { NextFunction, Request, Response } from "npm:@tinyhttp/app";

new App()
  .use((req: Request, res: Response, next: NextFunction) => {
    console.log("Did a request");
    next();
  })
  .get("/", (_, res) => res.send("<h1>Hello World</h1>"))
  .get("/page/:page", (req, res) => res.send(`You opened ${req.params.page}`))
  .listen(3000);
