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

  it('returns logout to a clear role-selection home instead of a bare code screen', () => {
    expect(source).toContain("location.replace('/connect?logout=1')")
    expect(source).toContain('Pilih mode SION Link')
    expect(source).toContain('data-role-label="Pemateri"')
    expect(source).toContain('data-role-label="Operator"')
    expect(source).toContain('data-role-label="Live Viewer"')
    expect(source).toContain('data-role-label="Stage Display"')
    expect(source).toContain("new URLSearchParams(location.search).get('logout') === '1'")
    expect(source).toContain('Anda sudah keluar')
  })

  it('renders PowerPoint Bridge frames directly for presenter clients instead of /media wrapping', () => {
    expect(source).toContain('function presentationFrameUrl(value)')
    expect(source).toContain("target.pathname.startsWith('/api/presentation-frame/')")
    expect(source).toContain('target.host = location.host')
    expect(source).toContain('const bridgeFrame = presentationFrameUrl(slide.visualPath)')
    expect(source).toContain('if (bridgeFrame) return bridgeFrame')
  })

  it('positions SION Link Web as browser access and sends advanced features to Desktop releases', () => {
    expect(source).toContain('Pilih mode SION Link Web')
    expect(source).toContain(
      'SION Link Web cocok untuk Pemateri, Operator, Live Viewer, dan Stage Display lewat browser'
    )
    expect(source).toContain('PowerPoint Bridge real-time')
    expect(source).toContain('Download SION Link Desktop')
    expect(source).toContain('https://github.com/AiWerek-Tech/SION-Media/releases/latest')
    expect(source).not.toContain('id="installButton"')
    expect(source).not.toContain('beforeinstallprompt')
    expect(source).not.toContain('installPwa')
  })
})
