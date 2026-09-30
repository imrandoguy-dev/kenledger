import type { LedgerData } from '../types/ledger'
import { normalize } from './storage'

export async function readBackupFile(file: File): Promise<LedgerData> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  return normalize(parsed)
}
