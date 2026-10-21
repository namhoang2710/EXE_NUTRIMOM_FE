const enabledFlag = (value) =>
  Boolean(value && !['0', 'false', 'no', 'off'].includes(value.toLowerCase()))

export function isAutomatedDevProcess(env) {
  return enabledFlag(env.CI) || enabledFlag(env.CODEX_CI) || Boolean(env.CODEX_TOOL_CALL_ID)
}

export function devBrowserLaunchOptions({ args, env, stdinIsTTY, stdoutIsTTY, platform, opener }) {
  const open = Boolean(
    stdinIsTTY && stdoutIsTTY &&
    !isAutomatedDevProcess(env) &&
    !args.includes('--no-browser') &&
    env.BROWSER?.toLowerCase() !== 'none'
  )
  const forwarded = args.filter((argument) => argument !== '--no-browser')
  if (open && !forwarded.some((argument) => argument === '--open' || argument.startsWith('--open='))) {
    forwarded.push('--open')
  }
  return {
    open,
    args: forwarded,
    browser: open ? env.BROWSER || (platform === 'win32' ? opener : undefined) : 'none',
  }
}
