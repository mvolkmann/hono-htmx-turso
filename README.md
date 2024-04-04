# cloudflare-hono-htmx-turso

This project provides an example of hosting a web app in Cloudflare
using htmx as the web library, Hono as the server library,
and Turso as the database host.

## Initial App

You can follow these steps to create and deploy this app yourself.
We will start by holding data in memory.
Later we will move it to a Turso (SQLite) database.

1. TODO: Describe creating a Cloudflare account.

1. Install <a href="https://bun.sh" target="_blank">Bun</a>.

1. Install the Cloudflare Worker CLI tool by entering
   `npm install -g wrangler`

1. Create a new project by entering `npm create cloudflare -- {app-name}`

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

1. If you chose not to deploy the app,
   `cd` to the `{app-name}` directory and enter `bun run deploy`

1. Copy the "Published" URL that is output and paste it in a web browser.

   Verify that it renders "Hello Hono!".

1. Rename `src/index.ts` to `src/server.tsx`

   Using the `tsx` file extension enables using JSX syntax.

1. Edit `package.json` and change `index.ts` to `server.tsx`
   in both the `dev` and `deploy` scripts.

1. Enter `bun add hono`

1. Enter `bun add @hono/zod-validator`

1. Create the `public` directory.

1. Create the file `public/index.html` containing the same as
   [htmx-dogs-crud](https://github.com/mvolkmann/htmx-examples/blob/main/htmx-dogs-crud) app,
   but delete the following line:

   ```html
   <script src="reload-client.js" type="module"></script>
   ```

1. Create the file `public/styles.css` containing the same as
   [htmx-dogs-crud](https://github.com/mvolkmann/htmx-examples/blob/main/htmx-dogs-crud) app.

1. Enter `bun add -D @types/bun`

1. Replace the contents of `src/server.tsx` with the contents of the same file in the
   [htmx-dogs-crud](https://github.com/mvolkmann/htmx-examples/blob/main/htmx-dogs-crud) app.

   Delete the following line:

   ```ts
   import './reload-server.ts';
   ```

   In the import for `serveStatic`,
   change "hono/bun" to "hono/cloudflare-workers".

   Add the following line:

   ```ts
   import manifest from '__STATIC_CONTENT_MANIFEST';
   ```

   Change the line that calls `serveStatic` to the following:

   ```ts
   app.use('/*', serveStatic({root: './', manifest}));
   ```

   Cloudflare doesn't allow generating random data like UUID values
   outside handler functions.
   To address this, change the lines that create initial dogs and
   the beginning of the `addDog` function to the following:

   ```ts
   addDog("Comet", "Whippet", "d1");
   addDog("Oscar", "German Shorthaired Pointer", "d2");

   function addDog(name: string, breed: string, id?: string): Dog {
     // Cloudflare doesn't allow random generation outside handlers.
     if (!id) id = crypto.randomUUID(); // standard web API
   ```

1. Add the following lines in `wrangler.toml`:

   ```toml
   main = "src/server.tsx"

   [site]
   bucket = "./public"
   ```

1. Start a local server by entering `bun dev`.
   Press "b" to open a browser to localhost:8787.

1. Test all the functionality by added a dog, editing it, and deleting it.

1. Redeploy the app by entering `bun run deploy`

1. Copy the "Published" URL, paste it in a browser, and test the deployed app.

## Adding Use of Turso

1. Browse the [Turso](https://turso.tech) website.

1. Click the "Sign Up" button and create an account
   OR click the "Login" button if you already have one.

1. Click "Databases" in the left nav.

1. Click the "New Database+" button.

1. Enter a database name like "dogs" and click the "Create Database" button.

1. Install the Turso CLI.

   In macOS this can be done by entering
   `brew install tursodatabase/tap/turso`.

   For other platforms, see the
   [Turso CLI Introduction](https://docs.turso.tech/cli).

1. Sign in by entering `turso auth signup`

1. Start a CLI session by entering `turso db shell dogs`

1. Create a table in the "dogs" database by entering
   `create table dogs(id integer primary key autoincrement, name string, breed string);`

1. Enter `bun add @libsql/client`

1. Enter `turso db tokens create dogs` to get a token value.

1. Enter `turso db info dogs` and note the URL.

1. Add `wrangler.toml` in the `.gitignore` file.
1. Add the following lines in the `wrangler.toml` file.

```toml
[vars]
TURSO_AUTH = "{token-from-above}"
TURSO_URL = "{url-from-above}"
```

TODO: Finish this.
