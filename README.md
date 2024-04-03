# cloudflare-hono-htmx-turso

This project provides an example of hosting a web app in Cloudflare
using htmx as the web library, Hono as the server library,
and Turso as the database host.

The steps followed to create this were:

- Install <a href="https://bun.sh" target="_blank">Bun</a>.

- Install the Cloudflare Worker CLI tool by entering
  `npm install -g wrangler`

- Create a new project by entering `npm create cloudflare -- {app-name}`

  - For "Ok to proceed", press enter.
  - For "What type of application do you want to create?",
    select "Website or web app".
  - For "Which development framework do you want to use?",
    select "Hono".
  - For "Do you want to install project dependencies?", press enter for "Y".
  - For "Which package manager do you want to use?", select "bun".
  - For "Do you want to use git for version control"?, press enter for "Yes".
  - For "Do you want to deploy your application"?, press enter for "Yes".
    This will open a new browser tab where you can
    "Sign up" to create a new account or "Log in" to an existing account.

- If you chose not to deploy the app,
  `cd` to the `{app-name}` directory and enter `bun run deploy`

- Copy the "Published" URL that is output and paste it in a web browser.

  Verify that it renders "Hello Hono!".

- Rename `src/index.ts` to `src/server.tsx`

  Using the `tsx` file extension enables using JSX syntax.

- Edit `package.json` and change `index.ts` to `server.tsx`
  in both the `dev` and `deploy` scripts.

- Enter `bun add hono`

- Enter `bun add @hono/zod-validator`

- Create the `public` directory.

- Create the file `public/index.html` containing the same as
  [htmx-dogs-crud](https://github.com/mvolkmann/htmx-examples/blob/main/htmx-dogs-crud) app,
  but delete the following line:

  ```html
  <script src="reload-client.js" type="module"></script>
  ```

- Create the file `public/styles.css` containing the same as
  [htmx-dogs-crud](https://github.com/mvolkmann/htmx-examples/blob/main/htmx-dogs-crud) app.

- Replace the contents of `src/server.tsx` with the contents of the same file in the
  [htmx-dogs-crud](https://github.com/mvolkmann/htmx-examples/blob/main/htmx-dogs-crud) app.

  Delete the following line:

  ```ts
  import "./reload-server.ts";
  ```

  In the import for `serveStatic`,
  change "hono/bun" to "hono/cloudflare-workers".

  Add the following line:

  ```ts
  import manifest from "__STATIC_CONTENT_MANIFEST";
  ```

  Change the line that calls `serveStatic` to the following:

  ```ts
  app.use("/*", serveStatic({ root: "./", manifest }));
  ```

  Cloudflare seems to not support using the `crypto.randomUUID` function,
  so change the beginning of the `addDog` function to the following:

  ```ts
  let lastId = 0;
  function addDog(name: string, breed: string): Dog {
    lastId++;
  ```

- Add the following lines in `wrangler.toml`:

  ```toml
  main = "src/server.tsx"

  [site]
  bucket = "./public"
  ```

- Start a local server by entering `bun dev`.
  Press "b" to open a browser to localhost:8787.

- Test all the functionality by added a dog, editing it, and deleting it.

- Redeploy the app by entering `bun run deploy`

TODO: Add use of Turso.
