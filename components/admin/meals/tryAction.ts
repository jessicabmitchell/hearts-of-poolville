type Failed = { ok: false; message: string };

/** Run a save, turning a dropped connection into a message instead of a broken page. */
export async function tryAction<R extends { ok: true } | Failed>(run: () => Promise<R>): Promise<R | Failed> {
  try {
    return await run();
  } catch (e) {
    console.error(e);
    return { ok: false, message: 'Could not reach the website. Check your connection and try again.' };
  }
}
