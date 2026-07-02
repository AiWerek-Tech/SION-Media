import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Modal, ModalButton } from '../Modal'
import { useModalStore } from '../../../store/useModalStore'

afterEach(() => {
  document.body.style.overflow = ''
  act(() => useModalStore.getState().closeAll())
})

describe('Modal system', () => {
  test('portals the dialog outside clipped feature ancestors', () => {
    render(
      <div data-testid="clipped-ancestor" style={{ overflow: 'hidden' }}>
        <Modal id="portal-test" title="Portal test" onClose={() => undefined}>
          Isi modal
        </Modal>
      </div>
    )

    expect(within(screen.getByTestId('clipped-ancestor')).queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Portal test' }).parentElement).toBe(document.body)
  })

  test('uses the controlled close callback for Escape and the dismissible backdrop', () => {
    const onClose = vi.fn()
    render(
      <Modal id="controlled-test" title="Controlled" onClose={onClose}>
        Isi modal
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(document.querySelector('.sp-modal-overlay') as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test('contains keyboard focus and restores focus after unmount', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    trigger.textContent = 'Buka'
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <Modal
        id="focus-test"
        title="Focus"
        onClose={() => undefined}
        footer={<ModalButton>Terakhir</ModalButton>}
      >
        <input aria-label="Pertama" />
      </Modal>
    )

    const first = screen.getByRole('button', { name: 'Tutup' })
    const last = screen.getByRole('button', { name: 'Terakhir' })
    await waitFor(() => expect(first).toHaveFocus())

    await user.tab({ shift: true })
    expect(last).toHaveFocus()

    await user.tab()
    expect(first).toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  test('locks background scrolling while mounted', () => {
    const { unmount } = render(
      <Modal id="scroll-test" title="Scroll" onClose={() => undefined}>
        Isi modal
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  test('only lets the top stacked modal respond to Escape', () => {
    const closeBottom = vi.fn()
    const closeTop = vi.fn()
    act(() => {
      useModalStore.setState({
        stack: [
          { id: 'bottom', type: 'confirm' },
          { id: 'top', type: 'confirm' }
        ]
      })
    })

    render(
      <>
        <Modal id="bottom" title="Bottom" onClose={closeBottom}>
          Bottom
        </Modal>
        <Modal id="top" title="Top" onClose={closeTop}>
          Top
        </Modal>
      </>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeBottom).not.toHaveBeenCalled()
    expect(closeTop).toHaveBeenCalledTimes(1)
  })
})
