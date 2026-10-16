/** Each mounted consumer owns its URLs, even when the underlying Blob request is shared. */
export function createObjectUrlLease(revoke = URL.revokeObjectURL) {
  const urls = new Set<string>()
  let released = false
  return {
    retain(url: string) {
      if (released) { revoke(url); return false }
      urls.add(url)
      return true
    },
    release() {
      released = true
      for (const url of urls) revoke(url)
      urls.clear()
    },
  }
}
