import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";

export async function replaceOutputs(outputs) {
  const suffix = randomUUID();
  const temporaryPaths = outputs.map(([path]) => `${path}.${suffix}.tmp`);
  const backupPaths = outputs.map(([path]) => `${path}.${suffix}.bak`);
  const backedUp = new Set();
  const installed = new Set();
  let preserveBackups = false;

  try {
    const writes = await Promise.allSettled(
      outputs.map(([, contents], index) => writeFile(temporaryPaths[index], contents, "utf8")),
    );
    const failedWrite = writes.find((result) => result.status === "rejected");
    if (failedWrite) throw failedWrite.reason;

    for (const [index, [path]] of outputs.entries()) {
      try {
        await rename(path, backupPaths[index]);
        backedUp.add(index);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    for (const [index, [path]] of outputs.entries()) {
      await rename(temporaryPaths[index], path);
      installed.add(index);
    }
  } catch (error) {
    await Promise.allSettled([...installed].map((index) => rm(outputs[index][0], { force: true })));
    const restores = await Promise.allSettled(
      [...backedUp].map((index) => rename(backupPaths[index], outputs[index][0])),
    );
    const restoreErrors = restores
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (restoreErrors.length > 0) {
      preserveBackups = true;
      throw new AggregateError([error, ...restoreErrors], "Could not restore previous outputs.");
    }
    throw error;
  } finally {
    const cleanupPaths = preserveBackups
      ? temporaryPaths
      : [...temporaryPaths, ...backupPaths];
    await Promise.allSettled(cleanupPaths.map((path) => rm(path, { force: true })));
  }
}
