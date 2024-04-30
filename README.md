# cloudflare-hono-htmx-turso

This project provides an example of hosting a basic CRUD web app in Cloudflare.
The web app uses htmx as the web library, Hono as the server library,
Zod for HTTP request validation, and Turso as the database host.

For details on each of these technologies, see my blog pages.

- [Cloudflare Workers](https://mvolkmann.github.io/blog/topics/#/blog/cloudflare-workers/)
- [Hono](https://mvolkmann.github.io/blog/topics/#/blog/hono/)
- [htmx](https://mvolkmann.github.io/blog/topics/#/blog/htmx/)
- [Turso](https://mvolkmann.github.io/blog/topics/#/blog/turso/)
- [Zod](https://mvolkmann.github.io/blog/topics/#/blog/zod/)

Hono, htmx, and Zod are free, open source libraries.

Cloudflare Workers provide a generous free tier.
The first 100,000 requests each day are free.
After that the cost is $5 USD per 10 million requests.

Turso also provides a generous free tier.
The "STARTER" tier, which is free, provides
9 GB of storage, 500 databases in 3 locations,
1 billion row reads per month, and 25 million row writes per month.

Follow these steps to create, deploy, and test this app yourself.

1. Install [Bun](https://bun.sh).

1. Create a Cloudflare account.

   - Browse [cloudflare.com](https://www.cloudflare.com).
   - Click the "Sign up" of "Log in" button in the upper-right.

1. Install the Cloudflare Worker CLI tool.

   Enter `npm install -g wrangler`

1. Create a new Cloudflare project.

   - Enter `npm create cloudflare -- {app-name}`
   - For "Ok to proceed", press enter.
   - For "What type of application do you want to create?",
     select "Website or web app".
   - For "Which development framework do you want to use?",
     select "Hono".
   - For "Do you want to install project dependencies?", press enter for "Y".
   - For "Which package manager do you want to use?", select "bun".
   - For "Do you want to use git for version control"?, press enter for "Yes".
   - For "Do you want to deploy your application"?, select "No".

1. Enable use of JSX for generating HTML.

   - Rename `src/index.ts` to `src/server.tsx`

     Using the `tsx` file extension enables using JSX syntax.

   - Edit `package.json` and change `index.ts` to `server.tsx`
     in both the `dev` and `deploy` scripts.

1. Create a Turso database.

   - Browse the [Turso](https://turso.tech) website.
   - Click the "Sign Up" button and create an account
     OR click the "Login" button if you already have one.
   - Click "Databases" in the left nav.
   - Click the "Create Database" or "New Database+" button.
   - Enter a database name and click the "Create Database" button.

1. Create a table in the Turso database using the CLI.

   - Install the Turso CLI.

     In macOS this can be done by entering
     `brew install tursodatabase/tap/turso`

     For other platforms, see the
     [Turso CLI Introduction](https://docs.turso.tech/cli).

   - Sign in to Turso by entering `turso auth signup`

   - Start a Turso CLI session by entering `turso db shell {db-name}`

   - Create a table by entering
     `create table dogs(id integer primary key autoincrement, name string, breed string);`
   - Enter `.quit`

1. Configure database access.

   - Enter `turso db tokens create {db-name}` to get a token value.

   - Enter `turso db show {db-name}` and note the URL.

   - Add `wrangler.toml` in the `.gitignore` file.

   - Add the following lines in the `wrangler.toml` file.

     ```toml
     main = "src/server.tsx"

     [site]
     bucket = "./public"

     [vars]
     TURSO_AUTH = "{token-from-above}"
     TURSO_URL = "{db-url-from-above}"
     ```

1. Create client-side files.

   - Create the `public` directory.
   - Copy the file `public/index.html` from this repository.
   - Copy the file `public/styles.css` from this repository.

1. Implement the server.

   - Install the libSQL client by entering `bun add @libsql/client`
   - Enter `bun add hono`
   - Enter `bun add @hono/zod-validator`
   - Copy the file `src/server.tsx` from this repository.
     - Several functions are passed a Hono `Context` object using
       the parameter name `c`. The property `c.env` is populated
       with environment variables specified in `wrangler.toml`.

1. Test the app locally.

   - Start a local server by entering `bun dev`.
   - Press "b" to open a browser to localhost:8787.
   - Add several dogs.
   - Edit one of the dogs.
   - Delete one of the dogs.
   - Refresh the brower to verify that changes were persisted.
     The dogs will be sorted on name after a refresh.

1. Verify the database contents.

   - Enter `turso db shell {db-name}`
   - Enter `select * from dogs;`
   - Enter `.quit`

1. Test the deployed app.

   - Authenticate with Cloudflare by entering `wrangler login`.  
     A browser window will open. Click the "Allow" button.
   - Deploy the app by entering `bun run deploy`
   - Copy the "Published" URL and paste it in a browser.
   - Add several dogs, edit one, and delete one.

1. View the app from the Cloudflare Dashboard.

   - Browse [cloudflare.com](https://www.cloudflare.com).
   - Click the "Sign up" of "Log in" button in the upper-right.
   - Click "Workers & Pages" in the left nav.
   - Click an app link.
   - Click the "Deployments" tab.
   - In the "Active Deployment" section, click a "View Version" link.
