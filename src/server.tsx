import {type Context, Hono} from 'hono';
import {serveStatic} from 'hono/cloudflare-workers';
import {createClient, type Client} from '@libsql/client';
import manifest from '__STATIC_CONTENT_MANIFEST';

type Dog = {id: number; name: string; breed: string};

type EnvType = {
  TURSO_AUTH: string;
  TURSO_URL: string;
};

let client: Client | null = null;
let selectedId = 0;

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
app.delete('/dog/:id', async (c: Context) => {
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
        {selectedId && (
          <button hx-get="/deselect" hx-swap="none" type="button">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
});

// Selects a dog.
app.get('/select/:id', (c: Context) => {
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
app.post('/dog', async (c: Context) => {
  const formData = await c.req.formData();
  const name = (formData.get('name') as string) || '';
  const breed = (formData.get('breed') as string) || '';
  const dog = await createDog(c.env, name, breed);
  return c.html(dogRow(dog), 201);
});

// Updates a dog
app.put('/dog/:id', async (c: Context) => {
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
