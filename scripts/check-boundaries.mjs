import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await check(file);
    else if (/\.[cm]?[jt]sx?$/.test(file)) {
      const { importedFiles } = ts.preProcessFile(await readFile(file, "utf8"));
      for (const imported of importedFiles) {
        const resolved = ts.resolveModuleName(
          imported.fileName,
          file,
          {
            moduleResolution: ts.ModuleResolutionKind.Bundler,
          },
          ts.sys,
        ).resolvedModule?.resolvedFileName;
        if (
          resolved &&
          path
            .resolve(resolved)
            .startsWith(path.resolve("src/server") + path.sep)
        ) {
          throw new Error(
            `Server import forbidden: ${file} -> ${imported.fileName}`,
          );
        }
      }
    }
  }
}
await check("src/client");
await check("src/shared");
