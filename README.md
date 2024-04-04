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

Follow these steps to create, deploy, and test this app yourself.

1. Install [Bun](https://bun.sh).

1. Create a Cloudflare account.

   - Browse [cloudflare.com](https://www.cloudflare.com).
   - Click the "Sign up" button in the upper-right.

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
   - Click the "New Database+" button.
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

   - Create the file `public/index.html` contain the following:

     ```html
     <!DOCTYPE html>
     <html lang="en">
       <head>
         <title>htmx CRUD</title>
         <meta name="description" content="Dogs CRUD" />
         <meta name="viewport" content="width=device-width" />
         <link rel="stylesheet" href="styles.css" />
         <script src="https://unpkg.com/htmx.org@1.9.10"></script>
       </head>
       <body>
         <h1>Dogs</h1>
         <div
           hx-trigger="load, selection-change from:body"
           hx-get="/form"
         ></div>
         <table hx-trigger="load" hx-get="/table-rows" hx-target="tbody">
           <thead>
             <tr>
               <th>Name</th>
               <th>Breed</th>
             </tr>
           </thead>
           <tbody></tbody>
         </table>
       </body>
     </html>
     ```

   - Create the file `public/styles.css` containing the following:

     ```css
     body {
       background-color: cornflowerblue;
       font-family: sans-serif;
     }

     button {
       background-color: lightgreen;
       border: none;
       border-radius: 0.5rem;
       margin-bottom: 1rem;
       padding: 0.5rem;

       &:disabled {
         background-color: gray;
       }
     }

     .buttons {
       display: flex;
       gap: 1rem;

       background-color: transparent;
     }

     h1 {
       color: black;
     }

     input {
       background-color: white;
       border: none;
       border-radius: 0.5rem;
       margin-bottom: 1rem;
       padding: 0.5rem;
     }

     label {
       display: inline-block;
       font-weight: bold;
       margin-right: 0.5rem;
       text-align: right;
       width: 3rem;
     }

     .on-hover:hover .show-on-hover {
       visibility: visible;
     }

     .show-on-hover {
       transform: scale(2.5) translate(0.2rem, 0.2rem);
       visibility: hidden;
     }

     table {
       border-collapse: collapse;
       display: none; /* fix for cummulative layout shift */
       margin-bottom: 0.5rem;
     }
     /* fix for cummulative layout shift */
     body:has(form) table {
       display: block;
     }

     td,
     th {
       border: 1px solid cornflowerblue;
       padding: 0.5rem;
     }

     td {
       background-color: white;

       & button {
         background-color: transparent;
         color: white;
       }
     }

     th {
       background-color: orange;
     }
     ```

1. Implement the server.

   - Install the libSQL client by entering `bun add @libsql/client`

   - Enter `bun add hono`

   - Enter `bun add @hono/zod-validator`

   - Replace the contents of `src/server.tsx` with the following:

     ```ts
     import {type Context, Hono} from 'hono';
     import {serveStatic} from 'hono/cloudflare-workers';
     import {zValidator} from '@hono/zod-validator';
     import {createClient, type Client} from '@libsql/client';
     import {z} from 'zod';
     import manifest from '__STATIC_CONTENT_MANIFEST';

     type Dog = {id: number; name: string; breed: string};

     type EnvType = {
       TURSO_AUTH: string;
       TURSO_URL: string;
     };

     let client: Client | null = null;
     let selectedId = 0;

     const idSchema = z.object({
       id: z.coerce.number().positive()
     });
     const idValidator = zValidator('param', idSchema);

     const dogSchema = z
       .object({
         name: z.string().min(1),
         breed: z.string().min(1)
       })
       .strict(); // no extra properties allowed
     const dogValidator = zValidator('form', dogSchema);

     async function createDog(
       env: EnvType,
       name: string,
       breed: string
     ): Promise<Dog> {
       const resultSet = await getClient(env).execute({
         sql: 'insert into dogs (name, breed) values (?, ?)',
         args: [name, breed]
       });
       const id = Number(resultSet.lastInsertRowid);
       return {id, name, breed};
     }

     async function deleteDog(env: EnvType, id: string): Promise<boolean> {
       const resultSet = await getClient(env).execute({
         sql: 'delete from dogs where id = ?',
         args: [id]
       });
       return resultSet.rowsAffected > 0;
     }

     function dogRow(dog: Dog, updating = false) {
       const attrs: {[key: string]: string} = {};
       if (updating) attrs['hx-swap-oob'] = 'true';
       return (
         <tr class="on-hover" id={`row-${dog.id}`} {...attrs}>
           <td>{dog.name}</td>
           <td>{dog.breed}</td>
           <td class="buttons">
             <button
               class="show-on-hover"
               hx-confirm="Are you sure?"
               hx-delete={`/dog/${dog.id}`}
               hx-target="closest tr"
               hx-swap="delete"
               type="button"
             >
               ✕
             </button>
             {/* This selects the dog which triggers a selection-change event,
                    which causes the form to update. */}
             <button
               class="show-on-hover"
               hx-get={'/select/' + dog.id}
               hx-swap="none"
               type="button"
             >
               ✎
             </button>
           </td>
         </tr>
       );
     }

     async function getAllDogs(env: EnvType): Promise<Dog[]> {
       const resultSet = await getClient(env).execute('select * from dogs');
       const {rows} = resultSet;
       return rows.map(
         row => ({id: Number(row.id), name: row.name, breed: row.breed} as Dog)
       );
     }

     function getClient(env: EnvType): Client {
       if (!client) {
         client = createClient({
           url: env.TURSO_URL as string,
           authToken: env.TURSO_AUTH
         });
       }
       return client;
     }

     async function getDog(env: EnvType, id: number): Promise<Dog | undefined> {
       const resultSet = await getClient(env).execute({
         sql: 'select * from dogs where id = ?',
         args: [id]
       });
       const {rows} = resultSet;
       const [row] = rows;
       return row
         ? ({id: Number(row.id), name: row.name, breed: row.breed} as Dog)
         : undefined;
     }

     async function updateDog(env: EnvType, dog: Dog) {
       const resultSet = await getClient(env).execute({
         sql: 'update dogs set name=?, breed=? where id = ?',
         args: [dog.name, dog.breed, dog.id]
       });
     }

     const app = new Hono();

     // Serve static files from the public directory.
     app.use('/*', serveStatic({root: './', manifest}));

     // Deletes the dog with a given id.
     app.delete('/dog/:id', idValidator, async (c: Context) => {
       const id = c.req.param('id');
       const existed = await deleteDog(c.env, id);
       if (!existed) c.status(404);
       return c.body(null);
     });

     // Deselects the currently selected dog.
     app.get('/deselect', (c: Context) => {
       selectedId = 0;
       c.header('HX-Trigger', 'selection-change');
       return c.body(null);
     });

     // Gets the proper form for either adding or updating a dog.
     app.get('/form', async (c: Context) => {
       const selectedDog = await getDog(c.env, selectedId);

       const attrs: {[key: string]: string} = {
         'hx-on:htmx:after-request': 'this.reset()'
       };
       if (selectedId) {
         // Update an existing row.
         // A new table row will replace the current one
         // using an out-of-band swap.
         attrs['hx-put'] = '/dog/' + selectedId;
       } else {
         // Add a new row.
         // A new table row will be added after the beginning of the
         // `tbody` element, making it the new, first child element.
         attrs['hx-post'] = '/dog';
         attrs['hx-target'] = 'tbody';
         attrs['hx-swap'] = 'afterbegin';
       }

       return c.html(
         <form hx-disabled-elt="#submit-btn" {...attrs}>
           <div>
             <label for="name">Name</label>
             <input
               id="name"
               name="name"
               required
               size={30}
               type="text"
               value={selectedDog?.name ?? ''}
             />
           </div>
           <div>
             <label for="breed">Breed</label>
             <input
               id="breed"
               name="breed"
               required
               size={30}
               type="text"
               value={selectedDog?.breed ?? ''}
             />
           </div>
           <div class="buttons">
             <button id="submit-btn">{selectedId ? 'Update' : 'Add'}</button>
             {selectedId ? (
               <button hx-get="/deselect" hx-swap="none" type="button">
                 Cancel
               </button>
             ) : null}
           </div>
         </form>
       );
     });

     // Selects a dog.
     app.get('/select/:id', idValidator, (c: Context) => {
       selectedId = Number(c.req.param('id'));
       c.header('HX-Trigger', 'selection-change');
       return c.body(null);
     });

     // Gets table rows for all the dogs.
     app.get('/table-rows', async (c: Context) => {
       const dogs = await getAllDogs(c.env);
       dogs.sort((a: Dog, b: Dog) => a.name.localeCompare(b.name));
       return c.html(<>{dogs.map(dog => dogRow(dog))}</>);
     });

     // Creates a dog.
     app.post('/dog', dogValidator, async (c: Context) => {
       const formData = await c.req.formData();
       const name = (formData.get('name') as string) || '';
       const breed = (formData.get('breed') as string) || '';
       const dog = await createDog(c.env, name, breed);
       return c.html(dogRow(dog), 201);
     });

     // Updates a dog
     app.put('/dog/:id', dogValidator, idValidator, async (c: Context) => {
       const id = Number(c.req.param('id'));
       const formData = await c.req.formData();
       const name = (formData.get('name') as string) || '';
       const breed = (formData.get('breed') as string) || '';
       const dog = {id, name, breed} as Dog;
       await updateDog(c.env, dog);

       selectedId = 0;
       c.header('HX-Trigger', 'selection-change');
       return c.html(dogRow(dog, true));
     });

     export default app;
     ```

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
