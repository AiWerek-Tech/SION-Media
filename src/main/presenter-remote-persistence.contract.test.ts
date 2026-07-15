import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('SION Link persistent connection contract', () => {
  const source = readFileSync(join(process.cwd(), 'src/main/presenter-remote-server.ts'), 'utf8')

  it('binds to a persisted fixed port instead of an ephemeral port', () => {
    expect(source).toContain('const DEFAULT_SION_LINK_PORT = 41732')
    expect(source).toContain("server?.listen(persistentPort, '0.0.0.0'")
    expect(source).not.toContain("server?.listen(0, '0.0.0'")
  })

  it('persists every role code and changes it only through manual regeneration', () => {
    expect(source).toContain("presenter: 'sion_link_presenter_code'")
    expect(source).toContain("operator: 'sion_link_operator_code'")
    expect(source).toContain("viewer: 'sion_link_viewer_code'")
    expect(source).toContain("stage: 'sion_link_stage_code'")
    expect(source).toContain('roleCodes = getPersistentRoleCodes()')
    expect(source).toContain('updateSetting(SION_LINK_ROLE_CODE_SETTINGS[role], nextCode)')
  })

  it('keeps exact program frames viewer-only and exposes lightweight slide previews to every role', () => {
    expect(source).toContain("if (clientRoles.get(client) !== 'viewer') continue")
    expect(source).toContain("url.pathname === '/api/slide-visual'")
    expect(source).toContain('visualUrl: `/api/slide-visual?position=${position}')
    expect(source).toContain("url.pathname === '/obs'")
    expect(source).toContain("'obs-browser-source'")
    expect(source).toContain('setInterval(()=>void poll(),500)')
  })
})
