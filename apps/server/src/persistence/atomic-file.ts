/** Generic atomic-write + copy helpers. No knowledge of domain shape. */

import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp`
  await writeFile(tmpPath, content, 'utf8')
  await rename(tmpPath, filePath)
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function copyFileEnsuringDir(source: string, destination: string): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(source, destination)
}

function hasErrnoCode(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err
}

function isNotFound(err: unknown): boolean {
  return hasErrnoCode(err) && err.code === 'ENOENT'
}
