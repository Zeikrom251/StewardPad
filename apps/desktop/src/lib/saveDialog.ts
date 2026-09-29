import { save } from '@tauri-apps/plugin-dialog'

/** "C:\Users\…\exports" + "file.csv", with whichever separator the folder already uses. */
export function inFolder(folder: string, name: string): string {
  if (!folder) return name
  const sep = folder.includes('\\') ? '\\' : '/'
  return `${folder.replace(/[\\/]+$/, '')}${sep}${name}`
}

/**
 * The native Save dialog, opened in Settings → Storage → Export folder with the file named.
 * Resolves to the chosen path, or null when the steward cancels.
 */
export function saveDialog(
  folder: string,
  name: string,
  filter: { name: string; extensions: string[] },
): Promise<string | null> {
  return save({ defaultPath: inFolder(folder, name), filters: [filter] })
}
