export function resolveLocalMediaPath(url: string): string {
  let filePath = decodeURIComponent(url).slice('local-media://'.length)
  filePath = filePath.replace(/\\/g, '/')

  if (filePath.startsWith('/') && filePath[2] === ':') {
    return filePath.slice(1)
  }

  if (/^[a-zA-Z]\//.test(filePath)) {
    return `${filePath[0]}:${filePath.slice(1)}`
  }

  return filePath
}
